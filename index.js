// index.js
import { WebSocketServer } from 'ws';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
const conversations = {}; // key = callSid, value = message array

wss.on('connection', (ws) => {
    console.log('🧵 Twilio connected via WebSocket');
  
    ws.on('message', async (data) => {
      let event;
      try {
        event = JSON.parse(data);
      } catch (e) {
        console.error('❌ Invalid JSON from Twilio:', data.toString());
        return;
      }
  
      console.log('📥 [Twilio] Event received:', JSON.stringify(event, null, 2));
      
      //Create an array that uses the CallSID as the id
      if (event.type === 'setup') {
        const callSid = event.callSid;
        conversations[callSid] = [];
        console.log(`📞 [Setup] Started new call with SID: ${callSid}`);
        return;
      }

      //kill the array values that have the call sid
      if (event.type === 'cleanup' || event.type === 'callEnded') {
        const callSid = event.callSid;
        delete conversations[callSid];
        console.log(`🧹 [Cleanup] Removed conversation for ${callSid}`);
      }

      // Only respond to user messages
      //if (event.type !== 'prompt' || !event.voicePrompt) {
      //  console.log('⚠️ [Twilio] Ignored event:', event.type);
      //  return;
      //}
        //Create an array that uses the CallSID as the id
    if (event.type === 'dtmf') {
        console.log(`📞 Got a dtmf event...`);
        return;
    }
    if (event.type === 'interrupt') {
        console.log(`📞 Rude.... Interrupted.`);
        return;
    }
    
    if (event.type === 'error') {
        console.log(`📞 got a Twilio Error...`);
        return;
    }
      const callSid = event.callSid;
      const userMessage = event.voicePrompt;
      console.log('🗣️ [Twilio] User said:', userMessage);

      if (!conversations[callSid]) {
        console.warn(`⚠️ No conversation initialized for ${callSid}`);
        conversations[callSid] = [];
      }

      conversations[callSid].push({ role: 'user', content: userMessage });
      
      // Try to send shit to gpt
      try {
        console.log('🤖 [OpenAI] Sending to GPT...');
        const gpt = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          //messages: [{ role: 'user', content: userMessage }],
          messages: conversations[callSid]
        });
  
        const reply = gpt.choices[0].message.content;
        conversations[callSid].push({ role: 'assistant', content: reply });
        console.log('✅ [OpenAI] Reply received:', reply);

  
        ws.send(JSON.stringify({
            type: 'text',
            token: reply,
            last: true
          }));
          console.log('🚀 [Server] Sent formatted reply with listen to Twilio');

      } catch (err) {
        console.error('OpenAI error:', err);
      }
    });
  
    ws.on('close', () => console.log('🔌 Twilio WebSocket closed'));
  });
  
  console.log('🧠 GPT-Twilio WebSocket server running');
