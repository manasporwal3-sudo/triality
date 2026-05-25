
'use server';
/**
 * @fileOverview A Genkit flow for generating personalized smart notifications based on user flavor profiles.
 *
 * - smartNotifications - A function that crafts unique notifications for the user.
 * - SmartNotificationsInput - The input type for the notification function.
 * - SmartNotificationsOutput - The return type for the notification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SmartNotificationsInputSchema = z.object({
  userFoodHistory: z.array(z.object({
    name: z.string(),
    category: z.string().optional(),
  })).describe('The user\'s past food orders and preferences.'),
  userName: z.string().describe('The name of the user.'),
});
export type SmartNotificationsInput = z.infer<typeof SmartNotificationsInputSchema>;

const SmartNotificationsOutputSchema = z.object({
  message: z.string().describe('A personalized, engaging notification message.'),
  suggestedDishId: z.string().optional().describe('ID of a dish to link to, if applicable.'),
});
export type SmartNotificationsOutput = z.infer<typeof SmartNotificationsOutputSchema>;

export async function smartNotifications(input: SmartNotificationsInput): Promise<SmartNotificationsOutput> {
  return smartNotificationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartNotificationPrompt',
  input: { schema: SmartNotificationsInputSchema },
  output: { schema: SmartNotificationsOutputSchema },
  prompt: `You are a friendly, expert food concierge for Bhartiya Swad, an authentic Indian food platform.
Your goal is to write a single, highly engaging, and personalized notification message for {{userName}}.

Analyze their food history:
{{{json userFoodHistory}}}

Guidelines:
1. If they order a lot of spicy food, suggest a new spicy dish.
2. If they have a sweet tooth, suggest a dessert.
3. Keep the tone warm, helpful, and "premium".
4. The message should be short (max 100 characters).
5. Use emojis where appropriate.

Example outputs:
- "Hey {{userName}}! It's dinner time. How about some spicy Paneer Tikka tonight? 🔥"
- "We noticed you love desserts! Our new Gulab Jamun is waiting for you. 🍮"
- "Feeling hungry? Explore our curated North Indian selection just for you!"

Return only the message and optionally a dish name mentioned.`,
});

const smartNotificationsFlow = ai.defineFlow(
  {
    name: 'smartNotificationsFlow',
    inputSchema: SmartNotificationsInputSchema,
    outputSchema: SmartNotificationsOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
