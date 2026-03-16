/**
 * async function getRuns(eventId) {
  const response = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
    headers: {
      Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`,
    },
  });
  const json = await response.json();
  return json.data;
}
 */
 
 
 export function IntelligenceTab({ session }: Props) {
   const [isCalled,setIsCall] = useState(false);
   const [eventId ,setEventId] = useState('')
   useEffect(()=>{
     if (isCalled) {
       const sendPipeline = await fetch('/api/pipeline',{
         method : 'POST'
       })
       const _dt = await sendPipeline.json();
       if (sendPipeline.ok) {
         const {id} = _dt;
         setEventId(id);
       }
     }
   },[isCalled])
   useEffect(()=>{
     async function getRuns(eventId) {
  const response = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
    headers: {
      Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`,
    },
  });
  const json = await response.json();
  return json.data;
}
   },[eventId])
   return (
     <div className="flex flex-col gap-4">
       <h1 className='py-6 border-b'>
         Intelligence 
       </h1>
       <div className='h-full w-full flex flex-col items-start justify-start gap-4 p-4'>
         <button className='rounded-full bg-black p-4 px-6'
         onClick={}
         >
           Try It!
         </button>
       </div>
     </div>
   )
 }