import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: message,
    });

    res.json({ answer: response.output_text });
  } catch (error: any) {
    console.error('OPENAI ERROR:', error);
    console.error('STATUS:', error?.status);
    console.error('MESSAGE:', error?.message);
    console.error('DETAILS:', error?.error);

    res.status(500).json({
      error: 'OpenAI request failed',
      message: error?.message,
      status: error?.status,
    });
  }
});

app.listen(3001, () => {
  console.log('AI server running on http://localhost:3001');
});
