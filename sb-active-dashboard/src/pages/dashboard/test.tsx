import dynamic from 'next/dynamic'
const TestMapNoSSR = dynamic(
  () => import ("../../ui/test/TestMap"),
  {ssr: false}
)

export default function Test() {
  return (
    
    <TestMapNoSSR />
  );
}