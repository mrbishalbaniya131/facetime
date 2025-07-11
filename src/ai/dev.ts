import { config } from 'dotenv';
config();

import '@/ai/flows/generate-initial-code.ts';
import '@/ai/flows/compare-detected-faces.ts';
import '@/ai/flows/text-to-speech.ts';
