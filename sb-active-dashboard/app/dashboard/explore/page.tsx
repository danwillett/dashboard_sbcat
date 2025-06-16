import dynamic from "next/dynamic";
const ExploreMapNoSSR = dynamic(
  () => import("../../ui/explore-app/ExploreMap"),
  { ssr: false }
);

export default function Explore() {
  return <ExploreMapNoSSR />;
}
