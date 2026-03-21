import PinwheelLoader from '@/components/logo';

export default function loading (){
  return (
    <main className = 'min-h-screen w-full flex flex items-center justify-center'>
      <PinwheelLoader size = {100} color = '#A8A8A8'/>
    </main>
  )
}