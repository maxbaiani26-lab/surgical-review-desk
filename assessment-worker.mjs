// CPU-only local inference. Remote requests download public runtime/model assets, never the case prompt.
export const RUNTIME_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
export const MODEL_ID='HuggingFaceTB/SmolLM2-1.7B-Instruct';
export const MAX_NEW_TOKENS=1800;
export function parseJSONReply(value){
  const text=String(value||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  // Only unwrap a complete fence; never salvage partial or ambiguous JSON.
  JSON.parse(text);return text;
}
export function cpuOptions(progress_callback){return {device:'wasm',dtype:'q4',progress_callback};}
export function configureCPU(env){
  env.allowLocalModels=false;env.useBrowserCache=true;
  // GitHub Pages cannot supply COOP/COEP headers. One WASM thread needs no SharedArrayBuffer.
  env.backends.onnx.wasm.numThreads=1;
  env.backends.onnx.wasm.proxy=false;
}
export function createRunner(loadRuntime=()=>import(RUNTIME_URL)){
  let generator=null,runtime=null;
  return async function run({model,messages,schema},send){
    if(model!==MODEL_ID)throw new Error('Unsupported CPU model. Upload matching application files.');
    if(!Array.isArray(messages)||!messages.length)throw new Error('No case prompt was supplied.');
    send({type:'progress',message:'Starting CPU AI (WebAssembly). No GPU or API key is needed.'});
    if(!generator){
      runtime=await loadRuntime();configureCPU(runtime.env);
      send({type:'progress',message:'Downloading/loading CPU model. First use downloads about 1.4 GB plus runtime files; keep this tab open. Stop cancels.'});
      generator=await runtime.pipeline('text-generation',MODEL_ID,cpuOptions(p=>{
        const amount=Number.isFinite(p.progress)?` ${Math.round(p.progress)}%`:'';
        send({type:'progress',message:`CPU model: ${p.status||'loading'}${amount}${p.file?' — '+p.file:''}`});
      }));
    }
    const input=messages.map(m=>({...m}));
    input[0]={...input[0],content:input[0].content+'\nReturn only one JSON object matching this schema (no markdown or extra text):\n'+JSON.stringify(schema)};
    const encoded=generator.tokenizer.apply_chat_template(input,{tokenize:true,add_generation_prompt:true,return_dict:true});
    const inputLength=encoded.input_ids.dims.at(-1);
    if(inputLength+MAX_NEW_TOKENS>8192)throw new Error('Case, policy and abstracts exceed the CPU model context (8,192 tokens including response). Shorten the query/result set or policy excerpt. No source was silently truncated.');
    send({type:'generating',message:`CPU model loaded. Reading ${inputLength} input tokens and generating a draft. This may take several minutes.`});
    let count=0,last=0;
    const streamer=new runtime.TextStreamer(generator.tokenizer,{skip_prompt:true,skip_special_tokens:true,callback_function:()=>{
      count++;const now=Date.now();if(now-last>1000){last=now;send({type:'progress',message:`CPU draft generation in progress (${count} text chunks). Stop cancels; no partial assessment is displayed.`});}
    }});
    const result=await generator(input,{max_new_tokens:MAX_NEW_TOKENS,do_sample:false,return_full_text:false,streamer});
    const generated=result?.[0]?.generated_text;
    const text=typeof generated==='string'?generated:Array.isArray(generated)?generated.at(-1)?.content:'';
    const json=parseJSONReply(text);
    send({type:'result',text:json});
  };
}
if(typeof self!=='undefined'){
  let run=createRunner(),busy=false;
  self.onmessage=async event=>{
    if(event.data.type!=='assess'||busy)return;
    busy=true;
    try{await run(event.data,msg=>self.postMessage(msg));}
    catch(error){self.postMessage({type:'error',message:String(error?.message||error)});run=createRunner();}
    finally{busy=false;}
  };
}
