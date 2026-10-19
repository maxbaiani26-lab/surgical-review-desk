// Local inference only. SDK and model artifacts load remotely; case prompts stay in this worker.
let engine;
self.onmessage=async event=>{
  if(event.data.type!=='assess')return;
  const {messages,schema,model}=event.data;
  try {
    if(!engine){
      self.postMessage({type:'progress',message:'Loading local AI runtime and model. The first download can take several minutes.'});
      const {MLCEngine}=await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm');
      engine=new MLCEngine({initProgressCallback:p=>self.postMessage({type:'progress',message:p.text || 'Loading model…'})});
      await engine.reload(model,{context_window_size:8192});
    }
    self.postMessage({type:'generating',message:'Analyzing retrieved abstracts, clinical facts, and policy clauses locally…'});
    const reply=await engine.chat.completions.create({messages,temperature:0,max_tokens:1800,response_format:{type:'json_object',schema:JSON.stringify(schema)}});
    const text=reply.choices?.[0]?.message?.content;
    if(!text || reply.choices?.[0]?.finish_reason==='length')throw new Error('The local model output was empty or exceeded its response budget.');
    await engine.resetChat();
    self.postMessage({type:'result',text});
  }catch(error){
    try{await engine?.resetChat();}catch{}
    self.postMessage({type:'error',message:String(error?.message || error)});
    // Drop the engine after an error so a later run can initialize cleanly.
    try{await engine?.unload();}catch{}
    engine=undefined;
  }
};
