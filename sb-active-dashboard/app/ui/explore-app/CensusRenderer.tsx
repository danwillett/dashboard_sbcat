"use client";

import React, { useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import RenderOptionsForm from "../dashboard/LayerList/RenderOptionsForm";
import * as math from "mathjs";

interface props {
  sublayer: any;
}

function CensusRenderer(props: props) {
  const { sublayer } = props;
  const [renderField, setRenderField] = useState();

  let fields = sublayer.layer.fields;

  fields = fields.filter((field: any) => field.type === "double");
  const normField = fields.filter((field: any) =>
    field.name.includes("_total")
  )[0];
  fields = fields.filter((field: any) => field.name !== normField.name);

  const changeRenderField = async (event: any) => {
    event.stopPropagation();
    // event.preventDefault()
    const field = event.target.value;

    let normDisplayField = normField.name;
    let lowStop = 0.1;
    let highStop = 0.5;
    let lowLabel = "<10%";
    let highLabel = ">50%";

    // if median attribute is selected, set low and high stops to be the min and max
    if (field.includes("_median")) {
      const median_stat_query = sublayer.layer.createQuery();
      median_stat_query.outStatistics = [
        {
          onStatisticField: field,
          outStatisticFieldName: "maxValue",
          statisticType: "max",
        },
        {
          onStatisticField: field,
          outStatisticFieldName: "minValue",
          statisticType: "min",
        },
      ];
      const statResults = await sublayer.layer.queryFeatures(median_stat_query);
      console.log(statResults);
      highStop = statResults.features[0].attributes.maxValue;
      highLabel = `${highStop}`;

      lowStop = statResults.features[0].attributes.minValue;
      lowLabel = `${lowStop}`;

      normDisplayField = "";
    }
    // otherwise pull the mean, and standard deviation to set low and high stops
    else {
      const field_query = sublayer.layer.createQuery();
      field_query.outFields = [field, normDisplayField];

      const statResults = await sublayer.layer.queryFeatures(field_query);
      console.log(statResults);
      let normField = statResults.features.map(
        (feature: any) =>
          feature.attributes[field] / feature.attributes[normDisplayField]
      );
      normField = normField.filter(
        (record: number) => record > 0 && record !== null
      );
      const mean = math.mean(normField);
      const stddev = math.std(normField);

      highStop = mean + stddev;
      console.log(highStop);
      // highStop = highStop < 0.3 ? 0.3 : highStop
      highStop = highStop > 0.9 ? 0.9 : highStop;
      highLabel = `> ${Math.round(highStop * 100)}%`;

      lowStop = mean - stddev;
      lowStop = lowStop < 0.1 ? 0.1 : lowStop;
      lowLabel = `> ${Math.round(lowStop * 100)}%`;
    }
    console.log("render this attribute");

    const renderer = sublayer.layer.renderer.clone();
    const colorVariable = renderer.visualVariables[0];

    colorVariable.field = field;
    colorVariable.normalizationField = normDisplayField;
    colorVariable.stops[0].value = lowStop;
    colorVariable.stops[0].label = lowLabel;
    colorVariable.stops[1].value = highStop;
    colorVariable.stops[1].label = highLabel;
    renderer.visualVariables = [colorVariable];

    sublayer.layer.renderer = renderer;
    console.log(colorVariable);
  };

  return (
    <RenderOptionsForm fields={fields} changeRenderField={changeRenderField} />
  );
}

// create a panel to choose which field to visualize
export default function addCensusRenderPanel(sublayer: any) {
  const container = document.createElement("div");
  const root = createRoot(container);
  root.render(<CensusRenderer sublayer={sublayer} />);

  // set panel layerlist panel
  sublayer.panel = {
    content: container,
    icon: "sliders-horizontal",
    title: "Visualization Fields",
  };
}
