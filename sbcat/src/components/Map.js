import React, {useEffect, useRef} from "react";
import 'dotenv/config'

console.log(process.env.ARC_API)

export default function Map() {
  const elementRef = useRef()

  useEffect(_=> {
    import("../data/app").then(
      app => app.initialize(elementRef.current)
    )
  })
      
  return (
    <div className="viewDiv" ref={elementRef}></div>
  )
}