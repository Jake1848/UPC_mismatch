import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

interface UPCAnalysisRequest {
  upc: string;
  productName?: string;
  description?: string;
  category?: string;
  existingData?: any[];
  conflictContext?: string;
}

interface AIAnalysisResult {
  confidence: number;
  suggestedResolution: string;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  detectedPatterns: string[];
}

class AIAnalysisService {
  private anthropic: Anthropic;
  private enabled: boolean;

  constructor() {
    this.enabled = !!process.env.ANTHROPIC_API_KEY;
    if (this.enabled) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  /**
   * Analyze UPC conflicts using AI to provide intelligent recommendations
   */
  async analyzeUPCConflict(request: UPCAnalysisRequest): Promise<AIAnalysisResult> {
    if (!this.enabled) {
      return this.getFallbackAnalysis(request);
    }

    try {
      const prompt = this.buildAnalysisPrompt(request);

      const completion = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.3,
        system: "You are an expert inventory management AI specializing in UPC conflict resolution. Analyze the data and provide actionable recommendations. Always respond with valid JSON.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const response = completion.content[0];
      if (response.type !== 'text' || !response.text) {
        throw new Error('No response from AI service');
      }

      return this.parseAIResponse(response.text);
    } catch (error) {
      logger.error('AI analysis failed:', error);
      return this.getFallbackAnalysis(request);
    }
  }

  /**
   * Detect fraudulent or suspicious UPC patterns
   */
  async detectFraud(upcData: any[]): Promise<{
    isSuspicious: boolean;
    fraudScore: number;
    indicators: string[];
    recommendations: string[];
  }> {
    if (!this.enabled) {
      return {
        isSuspicious: false,
        fraudScore: 0,
        indicators: [],
        recommendations: ['Enable AI analysis for fraud detection']
      };
    }

    try {
      const prompt = `
Analyze this UPC data for fraudulent patterns:

${JSON.stringify(upcData, null, 2)}

Look for:
- Duplicate UPCs with different products
- Suspicious pricing patterns
- Unusual product categorization
- Potential counterfeiting indicators

Respond with JSON only:
{
  "isSuspicious": boolean,
  "fraudScore": number (0-100),
  "indicators": ["list of suspicious patterns"],
  "recommendations": ["list of actions to take"]
}`;

      const completion = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        temperature: 0.2,
        system: "You are a fraud detection expert. Analyze the data and respond with valid JSON only.",
        messages: [{ role: "user", content: prompt }]
      });

      const response = completion.content[0];
      if (response.type !== 'text' || !response.text) {
        throw new Error('No response from AI service');
      }

      return JSON.parse(response.text);
    } catch (error) {
      logger.error('Fraud detection failed:', error);
      return {
        isSuspicious: false,
        fraudScore: 0,
        indicators: ['AI analysis unavailable'],
        recommendations: ['Manual review required']
      };
    }
  }

  /**
   * Generate intelligent product categorization
   */
  async categorizeProduct(productData: {
    upc: string;
    name: string;
    description?: string;
  }): Promise<{
    category: string;
    subcategory: string;
    confidence: number;
    suggestions: string[];
  }> {
    if (!this.enabled) {
      return {
        category: 'General',
        subcategory: 'Uncategorized',
        confidence: 0,
        suggestions: ['Enable AI for smart categorization']
      };
    }

    try {
      const prompt = `
Categorize this product:
UPC: ${productData.upc}
Name: ${productData.name}
Description: ${productData.description || 'N/A'}

Provide JSON response only:
{
  "category": "main category",
  "subcategory": "specific subcategory",
  "confidence": number (0-100),
  "suggestions": ["optimization suggestions"]
}`;

      const completion = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        temperature: 0.3,
        system: "You are a product categorization expert. Analyze the product and respond with valid JSON only.",
        messages: [{ role: "user", content: prompt }]
      });

      const response = completion.content[0];
      if (response.type !== 'text' || !response.text) {
        throw new Error('No response from AI service');
      }

      return JSON.parse(response.text);
    } catch (error) {
      logger.error('Product categorization failed:', error);
      return {
        category: 'General',
        subcategory: 'Uncategorized',
        confidence: 0,
        suggestions: ['Manual categorization required']
      };
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(request: UPCAnalysisRequest): string {
    return `
Analyze this UPC conflict situation:

UPC: ${request.upc}
Product: ${request.productName || 'Unknown'}
Description: ${request.description || 'N/A'}
Category: ${request.category || 'N/A'}

Existing Data:
${JSON.stringify(request.existingData || [], null, 2)}

Conflict Context: ${request.conflictContext || 'Multiple products found with same UPC'}

Please provide analysis in this JSON format:
{
  "confidence": number (0-100),
  "suggestedResolution": "clear action to take",
  "reasoning": "detailed explanation of the analysis",
  "riskLevel": "low|medium|high",
  "recommendations": ["list of specific recommendations"],
  "detectedPatterns": ["list of patterns found in the data"]
}

Consider:
- Data quality and consistency
- Business impact of different resolutions
- Risk of incorrect resolution
- Patterns that might indicate data entry errors
- Potential for automation
`;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(response: string): AIAnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback parsing if no JSON found
      return {
        confidence: 75,
        suggestedResolution: response.substring(0, 200),
        reasoning: response,
        riskLevel: 'medium',
        recommendations: ['Review AI analysis', 'Verify with human expert'],
        detectedPatterns: ['AI response parsing required']
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Provide fallback analysis when AI is unavailable
   */
  private getFallbackAnalysis(request?: UPCAnalysisRequest): AIAnalysisResult {
    return {
      confidence: 50,
      suggestedResolution: 'Manual review required - AI analysis unavailable',
      reasoning: 'AI analysis service is not configured or unavailable. Please review the conflict manually.',
      riskLevel: 'medium',
      recommendations: [
        'Enable AI analysis by configuring OpenAI API key',
        'Review conflict manually',
        'Check data sources for accuracy',
        'Implement data validation rules'
      ],
      detectedPatterns: ['AI analysis disabled']
    };
  }

  /**
   * Check if AI service is available
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export const aiAnalysisService = new AIAnalysisService();
export type { AIAnalysisResult, UPCAnalysisRequest };