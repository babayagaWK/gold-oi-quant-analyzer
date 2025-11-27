import { GoogleGenAI, Type } from "@google/genai";
import { MarketDataPoint, MarketAnalysis, OptionSeries, MarketFetchResult } from "../types";

// Helper to get AI instance with dynamic key
const getAI = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("API Key is missing. Please enter your Google Gemini API Key.");
  }
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Fetches "Real-Time" data using Google Search Grounding.
 */
export const fetchRealTimeMarketData = async (apiKey?: string): Promise<MarketFetchResult> => {
  const ai = getAI(apiKey);
  
  const prompt = `
    You are a professional market data retrieval agent.
    
    TASK: Get the latest REAL-TIME Gold market data AND Gold Options data (including Daily/Weekly series).

    STRATEGY FOR REAL-TIME ACCURACY:
    1. **Spot Price (XAU/USD)**: 
       - Search explicitly for "XAUUSD Live Price TradingView" OR "Gold Spot Price Live Kitco".
       - Look for the most recent, large, bold number indicating the current live bid/ask.
    
    2. **Future Price (Gold Futures - GC)**: 
       - **PROBLEM**: Investing.com search snippets often show delayed "Settlement" prices.
       - **SOLUTION**: Search for "Gold Futures Live Streaming Price Investing.com" AND "Gold Futures Price Yahoo Finance".
       - **CROSS-CHECK**: Yahoo Finance snippets are often more up-to-date. If Investing.com shows a price significantly lower/different than Yahoo, use Yahoo's price.
       - Look for the active contract (e.g., GCZ4, GCG5) labeled "Last", "Market", or "Live".
       - **IGNORE**: "Settlement Price", "Previous Close", or prices dated yesterday.

    3. **Open Interest (Futures)**: 
       - Search for "Gold Futures Open Interest CME Group" or "Gold Futures Volume and Open Interest CME".
       - Use the "Total Open Interest" or "Prior Day Open Interest" if today's is not finalized.
       
    4. **Gold Options (CME OG & Weeklies/Dailies)**:
       - Search for "CME Gold Options Open Interest by month" AND "CME Gold Weekly Daily Options OI".
       - Find the **3 most active Monthly** series (e.g., Dec 24, Feb 25).
       - Find the **2-3 most active Weekly or Daily** series (e.g., expiring this week, Today, Tomorrow).
       - **CRITICAL**: Identify the **CME Globex Code** for each (e.g., OGZ24 for Dec, or distinct daily codes like 1GO, 2GO if available).
       - **CLASSIFY**: Set 'type' to 'MONTHLY', 'WEEKLY', or 'DAILY' in the output.
       - For each, estimate the **Total Call Open Interest** and **Total Put Open Interest**.

    REQUIREMENTS:
    - Spot Price MUST be the current real-time market rate.
    - Future Price MUST be the latest live price.
    - Open Interest MUST come from CME Group.
    - Include the Option Series Code (e.g., OGZ24, 1GO).
    - Provide the exact numbers found.

    OUTPUT FORMAT:
    Return a strictly formatted JSON block. Do not include markdown text outside the block.
    \`\`\`json
    {
      "spotPrice": 2350.10,
      "futurePrice": 2365.20,
      "openInterest": 450000,
      "volume": 120000,
      "optionSeries": [
        { "expiry": "Dec 24", "code": "OGZ24", "type": "MONTHLY", "callOI": 15000, "putOI": 12000 },
        { "expiry": "Feb 25", "code": "OGG25", "type": "MONTHLY", "callOI": 8000, "putOI": 6000 },
        { "expiry": "Oct W4", "code": "OGV4", "type": "WEEKLY", "callOI": 5000, "putOI": 4000 },
        { "expiry": "Daily 24 Oct", "code": "4GO", "type": "DAILY", "callOI": 1500, "putOI": 2000 }
      ]
    }
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using flash for speed
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType is NOT allowed with googleSearch
      }
    });

    const text = response.text || "";
    
    // Extract JSON from the text response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    
    let parsedData = { 
        spotPrice: 0, 
        futurePrice: 0, 
        openInterest: 0, 
        volume: 0,
        optionSeries: [] as OptionSeries[]
    };
    
    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse JSON from AI response", e);
      }
    }

    // Extract grounding metadata (sources)
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web ? { title: chunk.web.title || "Source", uri: chunk.web.uri || "" } : null)
      .filter(item => item !== null) as Array<{title: string, uri: string}> || [];

    // Fallback/Validation
    if (!parsedData.spotPrice || parsedData.spotPrice === 0) {
        // If parsing failed, try to extract numbers using regex as a fallback
        const numbers = text.match(/[\d,]+\.?\d*/g)?.map(n => parseFloat(n.replace(/,/g, ''))) || [];
        if (numbers.length >= 3) {
           parsedData.spotPrice = numbers[0];
           parsedData.futurePrice = numbers[1];
           parsedData.openInterest = numbers[2];
        } else {
           throw new Error("AI could not retrieve valid price data.");
        }
    }
    
    // Validate Option Series (Ensure it's an array)
    if (!Array.isArray(parsedData.optionSeries)) {
        parsedData.optionSeries = [];
    }

    return {
      dataPoint: {
        timestamp: Date.now(),
        timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        spotPrice: parsedData.spotPrice,
        futurePrice: parsedData.futurePrice,
        openInterest: parsedData.openInterest,
        volume: parsedData.volume || 1000
      },
      optionSeries: parsedData.optionSeries,
      sources
    };

  } catch (error) {
    console.error("Gemini Real-Time Fetch Error:", error);
    throw error;
  }
};

export const analyzeMarketData = async (
    data: MarketDataPoint[], 
    sources: Array<{title: string, uri: string}> = [],
    apiKey?: string,
    userPrompt?: string
): Promise<MarketAnalysis> => {
  const ai = getAI(apiKey);
  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : data[0];

  // Calculate metrics
  const priceChange = latest.spotPrice - previous.spotPrice;
  const oiChange = latest.openInterest - previous.openInterest;
  const basis = latest.futurePrice - latest.spotPrice;
  
  const prompt = `
    You are an expert Gold (XAU/USD) Intraday Quantitative Analyst.
    Your task is to analyze the market for a Day Trader using MT5.

    Current Statistics:
    - Spot Price: ${latest.spotPrice}
    - Future Price (Investing.com/Yahoo): ${latest.futurePrice}
    - Basis (Future - Spot): ${basis.toFixed(2)}
    - Open Interest (CME): ${latest.openInterest}
    - Immediate Price Change: ${priceChange.toFixed(2)}
    - Immediate OI Change: ${oiChange}
    
    Interpretation Logic (Standard Quant Rules):
    1. Price UP + OI UP: Trend Confirmation (New Longs). Bullish.
    2. Price UP + OI DOWN: Short Covering. Weak Bullish.
    3. Price DOWN + OI UP: Trend Confirmation (New Shorts). Bearish.
    4. Price DOWN + OI DOWN: Long Liquidation. Weak Bearish.
    
    ${userPrompt ? `
    **USER SPECIFIC QUESTION / CONTEXT**:
    The user has asked specifically: "${userPrompt}"
    Please ensure your analysis and recommendation directly addresses this question in addition to the standard analysis.
    ` : ''}

    Analysis Requirements:
    1. **Intraday Focus**: Analyze the immediate trend for day trading (Intraday).
    2. **Support/Resistance**: Estimate the key Intraday Support and Resistance levels based on the current price.
    3. **Strategy**: Suggest a clear entry/exit strategy for MT5 CFD.

    IMPORTANT INSTRUCTIONS FOR LANGUAGE:
    - All text MUST be written in THAI LANGUAGE (ภาษาไทย).
    - Use professional trading terminology in Thai.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
            summary: { type: Type.STRING, description: "A summary of Intraday market condition in Thai." },
            recommendation: { type: Type.STRING, description: "Actionable Intraday advice for MT5 trader in Thai." },
            basis: { type: Type.NUMBER, description: "The calculated basis spread." },
            oiTrend: { type: Type.STRING, enum: ["RISING", "FALLING", "STABLE"] },
            priceTrend: { type: Type.STRING, enum: ["RISING", "FALLING", "STABLE"] },
            support: { type: Type.STRING, description: "Estimated Intraday Support Level (e.g. '2345-2348')" },
            resistance: { type: Type.STRING, description: "Estimated Intraday Resistance Level (e.g. '2360-2365')" }
          },
          required: ["sentiment", "confidence", "summary", "recommendation", "basis", "oiTrend", "priceTrend", "support", "resistance"]
        }
      }
    });

    if (response.text) {
      const analysis = JSON.parse(response.text) as MarketAnalysis;
      analysis.sourceUrls = sources; // Attach sources from the fetch step if available
      return analysis;
    }
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      sentiment: 'NEUTRAL',
      confidence: 0,
      summary: "ไม่สามารถเชื่อมต่อ AI ได้ หรือ API Key ไม่ถูกต้อง โปรดตรวจสอบ Key และลองใหม่อีกครั้ง",
      recommendation: "ชะลอการซื้อขายจนกว่าข้อมูลจะกลับมาเป็นปกติ",
      basis: basis,
      oiTrend: 'STABLE',
      priceTrend: 'STABLE',
      support: "-",
      resistance: "-",
      sourceUrls: []
    };
  }
};