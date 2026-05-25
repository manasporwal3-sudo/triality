'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- SCHEMAS ---

const FullFoodItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  rating: z.number().optional(),
  imageURL: z.string().optional(),
});

const UserFoodHistoryItemSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
});

const PersonalizedFoodRecommendationsInputSchema = z.object({
  userFoodHistory: z.array(UserFoodHistoryItemSchema),
  availableFoods: z.array(FullFoodItemSchema),
});

const PersonalizedFoodRecommendationsOutputSchema = z.object({
  recommendations: z.array(FullFoodItemSchema),
});

export type PersonalizedFoodRecommendationsInput = z.infer<typeof PersonalizedFoodRecommendationsInputSchema>;
export type PersonalizedFoodRecommendationsOutput = z.infer<typeof PersonalizedFoodRecommendationsOutputSchema>;

// --- PROMPT ---

const recommendationPrompt = ai.definePrompt({
  name: 'personalizedFoodRecommendationPrompt',
  input: {
    schema: z.object({
      userFoodHistory: z.array(UserFoodHistoryItemSchema),
      simplifiedAvailableFoods: z.array(z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
      })),
    }),
  },
  output: {
    schema: z.object({
      // Enforcing min 3, max 5 for consistent UI
      recommendedFoodIds: z.array(z.string()).min(3).max(5),
    }),
  },
  prompt: `You are an expert food recommender for Bhartiya Swad.
Based on the user's history, suggest 3 to 5 items from the available list.
Only use IDs present in the provided list. 
Avoid suggesting items the user has already eaten.

User History: {{{json userFoodHistory}}}
Available Items: {{{json simplifiedAvailableFoods}}}`,
});

// --- FLOW ---

export const personalizedFoodRecommendations = ai.defineFlow(
  {
    name: 'personalizedFoodRecommendations',
    inputSchema: PersonalizedFoodRecommendationsInputSchema,
    outputSchema: PersonalizedFoodRecommendationsOutputSchema,
  },
  async (input) => {
    // 1. TOKEN SAFETY: Only send top 50 items to the LLM
    const topAvailable = input.availableFoods
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 50);

    const simplified = topAvailable.map(f => ({
      id: f.id,
      name: f.name,
      category: f.category,
    }));

    try {
      const { output } = await recommendationPrompt({
        userFoodHistory: input.userFoodHistory,
        simplifiedAvailableFoods: simplified,
      });

      if (!output?.recommendedFoodIds) {
        throw new Error("No output from LLM");
      }

      // 2. ROBUST MAPPING: Filter out any IDs the LLM might have hallucinated
      const recommendations = output.recommendedFoodIds
        .map(id => input.availableFoods.find(food => food.id === id))
        .filter((f): f is z.infer<typeof FullFoodItemSchema> => !!f);

      // 3. FALLBACK: If mapping fails or is empty, return the top 3 available items
      if (recommendations.length === 0) {
        return { recommendations: input.availableFoods.slice(0, 3) };
      }

      return { recommendations };
    } catch (error) {
      console.error("Recommendation Error:", error);
      // Return first 3 items as a safe fallback instead of an empty screen
      return { recommendations: input.availableFoods.slice(0, 3) };
    }
  }
);
