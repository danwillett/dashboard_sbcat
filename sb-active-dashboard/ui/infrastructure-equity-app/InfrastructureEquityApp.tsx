import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataQueryMap from "@/ui/data-query-app/components/DataQueryMap";
import DataQueryMapWidgets from "@/ui/data-query-app/components/DataQueryMapWidgets";
import InfrastructureEquityLeftSidebar, {
  EquitySetupPhase,
  EquitySetupStep,
} from "@/ui/infrastructure-equity-app/layout/InfrastructureEquityLeftSidebar";
import InfrastructureEquityRightSidebar from "@/ui/infrastructure-equity-app/layout/InfrastructureEquityRightSidebar";
import EquityBivariateLegend from "@/ui/infrastructure-equity-app/components/EquityBivariateLegend";
import {
  CatalogCategoryNode,
  fetchCatalogTree,
  filterVisibleCatalogTree,
  findDatasetInTree,
} from "@/lib/data-services/CatalogApiService";
import {
  EquityContextCategoryKind,
  collectInfrastructureEquityDatasets,
  collectDemographicsContextDatasets,
  inferEquityGeographyUnit,
  EquityGeographyUnit,
} from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import {
  detectDemographicsGeographySupport,
  detectDemographicsIndicatorBlockGroupSupport,
  DemographicsGeographySupport,
  isTractOnlyDemographicsSupport,
} from "@/lib/infrastructure-equity-app/infrastructureEquityDemographicsGeography";
import {
  DEFAULT_INFRASTRUCTURE_COMFORT_SELECTION,
  InfrastructureComfortSelection,
  isInfrastructureComfortSelectionValid,
} from "@/lib/infrastructure-equity-app/infrastructureEquityMetrics";
import {
  createDefaultEquityGeographicFilter,
  EquityGeographicFilter,
  EquityGeographicLevel,
  listEquityJurisdictionPlaceNames,
  resolveEquityBoundaryGeometry,
} from "@/lib/infrastructure-equity-app/infrastructureEquityGeography";
import { runInfrastructureEquityAnalysis, computeInfrastructureEquityUnits, formatEquityAnalysisError, InfrastructureEquityUnitComputation } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import {
  DEFAULT_EQUITY_BIN_COUNT,
  EquityBinCount,
  buildEquityBivariateBreaks,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";
import {
  formatCombinedContextIndicatorLabel,
  formatEquityAnalysisContextMetricLabel,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";
import { infrastructureMetricLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityMetrics";
import {
  loadNumericContextFields,
  pickDefaultNumericContextField,
} from "@/lib/infrastructure-equity-app/infrastructureEquityContextFields";
import {
  addPinnedEquityAnalysisToMap,
  removeAllEquityAnalysisLayersFromMap,
  removeBikeComfortReferenceLayerFromMap,
  removeContextReferenceLayerFromMap,
  resetGeographicExtentPreviewCache,
  removeGeographicExtentPreviewLayerFromMap,
  removePinnedEquityAnalysisFromMap,
  syncBikeComfortReferenceLayer,
  syncContextReferenceLayer,
  syncGeographicExtentPreviewLayer,
  zoomMapToEquityGeographicExtent,
  addEquityCustomBinPreviewLayer,
  clearEquityAnalysisUnitHighlight,
  highlightEquityAnalysisUnitOnMap,
  removeEquityCustomBinPreviewLayer,
  removeEquityCustomBinPreviewLayers,
} from "@/lib/infrastructure-equity-app/infrastructureEquityMapLayers";
import {
  createPinnedEquityAnalysis,
  EQUITY_CUSTOM_BIN_CONTEXT_LAYER_ID,
  EQUITY_CUSTOM_BIN_INFRASTRUCTURE_LAYER_ID,
  PinnedEquityAnalysis,
} from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";
import "@/ui/data-query-app/data-query-map-widgets.css";

export default function InfrastructureEquityApp() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [tree, setTree] = useState<CatalogCategoryNode[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [phase, setPhase] = useState<EquitySetupPhase>("intro");
  const [setupStep, setSetupStep] = useState<EquitySetupStep>("geographic");
  const [infrastructureDatasetId, setInfrastructureDatasetId] = useState<
    number | null
  >(null);
  const [infrastructureComfortSelection, setInfrastructureComfortSelection] =
    useState<InfrastructureComfortSelection>(
      DEFAULT_INFRASTRUCTURE_COMFORT_SELECTION
    );
  const [contextKind, setContextKind] =
    useState<EquityContextCategoryKind | null>(null);
  const [contextDatasetId, setContextDatasetId] = useState<number | null>(null);
  const [selectedContextFields, setSelectedContextFields] = useState<string[]>(
    []
  );
  const [contextFieldOptions, setContextFieldOptions] = useState<__esri.Field[]>(
    []
  );
  const [contextFieldsLoading, setContextFieldsLoading] = useState(false);
  const [contextFieldsError, setContextFieldsError] = useState<string | null>(
    null
  );

  const [pinnedAnalyses, setPinnedAnalyses] = useState<PinnedEquityAnalysis[]>(
    []
  );
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [geographicFilter, setGeographicFilter] = useState<EquityGeographicFilter>(
    createDefaultEquityGeographicFilter
  );
  const [jurisdictionPlaces, setJurisdictionPlaces] = useState<string[]>([]);
  const [jurisdictionPlacesLoading, setJurisdictionPlacesLoading] =
    useState(false);
  const [bikeComfortVisible, setBikeComfortVisible] = useState(false);
  const [contextLayerVisible, setContextLayerVisible] = useState(false);
  const [demographicsGeographyUnit, setDemographicsGeographyUnit] =
    useState<EquityGeographyUnit>("tract");
  const [demographicsGeographySupport, setDemographicsGeographySupport] =
    useState<Record<number, DemographicsGeographySupport>>({});
  const [demographicsIndicatorBlockGroupSupport, setDemographicsIndicatorBlockGroupSupport] =
    useState<Record<number, Record<string, boolean>>>({});

  const [usingDefaultBins, setUsingDefaultBins] = useState(true);
  const [customBinMapping, setCustomBinMapping] = useState(false);
  const [binsMapPreviewBusy, setBinsMapPreviewBusy] = useState(false);
  const [contextBinsMapVisible, setContextBinsMapVisible] = useState(false);
  const [infrastructureBinsMapVisible, setInfrastructureBinsMapVisible] =
    useState(false);
  const [binCount, setBinCount] = useState<EquityBinCount>(DEFAULT_EQUITY_BIN_COUNT);
  const [infrastructureBreaks, setInfrastructureBreaks] = useState<number[] | null>(
    null
  );
  const [contextBreaks, setContextBreaks] = useState<number[] | null>(null);
  const [binPreview, setBinPreview] =
    useState<InfrastructureEquityUnitComputation | null>(null);
  const [binPreviewLoading, setBinPreviewLoading] = useState(false);
  const [binPreviewError, setBinPreviewError] = useState<string | null>(null);
  const [binPreviewProgress, setBinPreviewProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [lastRunConfigKey, setLastRunConfigKey] = useState<string | null>(null);

  const mapViewRef = useRef(mapView);
  mapViewRef.current = mapView;
  const suppressingBinLayerWatchRef = useRef(0);
  const contextBinSyncIdRef = useRef(0);
  const infrastructureBinSyncIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const rawTree = await fetchCatalogTree();
        if (cancelled) return;
        setTree(filterVisibleCatalogTree(rawTree));
      } catch (error) {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Failed to load catalog datasets."
          );
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      removeAllEquityAnalysisLayersFromMap(mapViewRef.current);
      removeBikeComfortReferenceLayerFromMap(mapViewRef.current);
      removeContextReferenceLayerFromMap(mapViewRef.current);
      removeGeographicExtentPreviewLayerFromMap(mapViewRef.current);
      removeEquityCustomBinPreviewLayers(mapViewRef.current);
    };
  }, []);

  const infrastructureDataset = useMemo(
    () =>
      infrastructureDatasetId
        ? findDatasetInTree(tree, infrastructureDatasetId)
        : null,
    [tree, infrastructureDatasetId]
  );

  const contextDataset = useMemo(
    () =>
      contextDatasetId ? findDatasetInTree(tree, contextDatasetId) : null,
    [tree, contextDatasetId]
  );

  const activeAnalysis = useMemo(
    () =>
      pinnedAnalyses.find((entry) => entry.id === activeAnalysisId) ?? null,
    [pinnedAnalyses, activeAnalysisId]
  );

  useEffect(() => {
    if (phase !== "setup" || setupStep !== "infrastructure") return;
    if (infrastructureDatasetId != null) return;

    const datasets = collectInfrastructureEquityDatasets(tree);
    if (datasets.length > 0) {
      setInfrastructureDatasetId(datasets[0].id);
    }
  }, [phase, setupStep, tree, infrastructureDatasetId]);

  useEffect(() => {
    if (!contextDataset) {
      setContextFieldOptions([]);
      setSelectedContextFields([]);
      setContextFieldsError(null);
      return;
    }

    let cancelled = false;
    setContextFieldsLoading(true);
    setContextFieldsError(null);

    (async () => {
      try {
        const fields = await loadNumericContextFields(
          contextDataset,
          contextKind
        );
        if (cancelled) return;
        setContextFieldOptions(fields);
        const defaultField = pickDefaultNumericContextField(fields, {
          contextKind,
          dataset: contextDataset,
        });
        setSelectedContextFields(defaultField ? [defaultField.name] : []);

        if (contextKind === "demographics") {
          const indicatorSupport = await detectDemographicsIndicatorBlockGroupSupport(
            contextDataset,
            fields.map((field) => field.name)
          );
          if (!cancelled) {
            setDemographicsIndicatorBlockGroupSupport((prev) => ({
              ...prev,
              [contextDataset.id]: indicatorSupport,
            }));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setContextFieldOptions([]);
          setSelectedContextFields([]);
          setContextFieldsError(
            error instanceof Error
              ? error.message
              : "Failed to load context layer fields."
          );
        }
      } finally {
        if (!cancelled) setContextFieldsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contextDataset, contextKind]);

  const demographicsDatasetIds = useMemo(() => {
    if (contextKind !== "demographics") return [];
    return collectDemographicsContextDatasets(tree).map((dataset) => dataset.id);
  }, [contextKind, tree]);

  useEffect(() => {
    if (demographicsDatasetIds.length === 0) {
      setDemographicsGeographySupport({});
      return;
    }

    let cancelled = false;

    (async () => {
      const datasets = collectDemographicsContextDatasets(tree);
      const entries = await Promise.all(
        datasets.map(async (dataset) => {
          const support = await detectDemographicsGeographySupport(dataset);
          return [dataset.id, support] as const;
        })
      );
      if (!cancelled) {
        setDemographicsGeographySupport(Object.fromEntries(entries));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contextKind, demographicsDatasetIds, tree]);

  useEffect(() => {
    if (
      contextKind !== "demographics" ||
      demographicsGeographyUnit !== "block" ||
      !contextDatasetId
    ) {
      return;
    }

    const support = demographicsIndicatorBlockGroupSupport[contextDatasetId];
    if (!support) return;

    setSelectedContextFields((prev) =>
      prev.filter((fieldName) => support[fieldName])
    );
  }, [
    contextKind,
    contextDatasetId,
    demographicsGeographyUnit,
    demographicsIndicatorBlockGroupSupport,
  ]);

  useEffect(() => {
    if (contextKind !== "demographics" || !contextDatasetId) return;
    const support = demographicsGeographySupport[contextDatasetId];
    if (
      isTractOnlyDemographicsSupport(support) &&
      demographicsGeographyUnit === "block"
    ) {
      setDemographicsGeographyUnit("tract");
    }
  }, [
    contextKind,
    contextDatasetId,
    demographicsGeographySupport,
    demographicsGeographyUnit,
  ]);

  const contextGeographyUnit =
    contextDataset && contextKind
      ? contextKind === "demographics"
        ? demographicsGeographyUnit
        : inferEquityGeographyUnit(contextDataset, contextKind)
      : null;

  useEffect(() => {
    if (!mapView) return;

    const active = phase !== "intro";

    (async () => {
      await syncGeographicExtentPreviewLayer(
        mapView,
        active,
        active ? geographicFilter : null
      );
    })();
  }, [mapView, phase, geographicFilter]);

  useEffect(() => {
    if (!mapView) return;

    let cancelled = false;

    (async () => {
      const boundaryGeometry =
        geographicFilter.level === "county"
          ? null
          : await resolveEquityBoundaryGeometry(geographicFilter);

      if (cancelled) return;

      const previewActive = phase !== "intro";

      await syncBikeComfortReferenceLayer(
        mapView,
        previewActive && bikeComfortVisible ? infrastructureDataset : null,
        bikeComfortVisible,
        boundaryGeometry,
        infrastructureComfortSelection
      );

      await syncContextReferenceLayer(
        mapView,
        previewActive && contextLayerVisible ? contextDataset : null,
        contextLayerVisible,
        boundaryGeometry,
        selectedContextFields,
        contextKind,
        contextGeographyUnit
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [
    mapView,
    phase,
    bikeComfortVisible,
    contextLayerVisible,
    infrastructureDataset,
    contextDataset,
    selectedContextFields,
    contextKind,
    contextGeographyUnit,
    geographicFilter,
    infrastructureComfortSelection,
  ]);

  useEffect(() => {
    const level = geographicFilter.level;
    if (level !== "city" && level !== "service-area") {
      return;
    }

    if (phase !== "setup" && phase !== "review") {
      return;
    }

    let cancelled = false;
    setJurisdictionPlacesLoading(true);

    listEquityJurisdictionPlaceNames(level)
      .then((places) => {
        if (cancelled) return;
        setJurisdictionPlaces(places);
      })
      .catch(() => {
        if (!cancelled) setJurisdictionPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setJurisdictionPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [phase, setupStep, geographicFilter.level]);

  useEffect(() => {
    if (
      geographicFilter.level !== "city" &&
      geographicFilter.level !== "service-area"
    ) {
      return;
    }
    if (
      jurisdictionPlacesLoading ||
      jurisdictionPlaces.length === 0 ||
      geographicFilter.placeName
    ) {
      return;
    }

    setGeographicFilter((prev) => ({
      ...prev,
      placeName: jurisdictionPlaces[0],
    }));
  }, [
    geographicFilter.level,
    geographicFilter.placeName,
    jurisdictionPlaces,
    jurisdictionPlacesLoading,
  ]);

  const canRunAnalysis =
    infrastructureDataset != null &&
    isInfrastructureComfortSelectionValid(infrastructureComfortSelection) &&
    contextKind != null &&
    contextDataset != null &&
    selectedContextFields.length > 0 &&
    !contextFieldsLoading &&
    (geographicFilter.level === "county" ||
      (!jurisdictionPlacesLoading &&
        geographicFilter.placeName != null &&
        jurisdictionPlaces.includes(geographicFilter.placeName)));

  const canConfigureBins = canRunAnalysis;

  const binPreviewKey = useMemo(() => {
    if (!canConfigureBins || !infrastructureDataset || !contextDataset || !contextKind) {
      return null;
    }
    return [
      infrastructureDataset.id,
      JSON.stringify(infrastructureComfortSelection),
      contextDataset.id,
      contextKind,
      selectedContextFields.join(","),
      demographicsGeographyUnit,
      geographicFilter.level,
      geographicFilter.placeName ?? "",
    ].join("|");
  }, [
    canConfigureBins,
    infrastructureDataset,
    infrastructureComfortSelection,
    contextDataset,
    contextKind,
    selectedContextFields,
    demographicsGeographyUnit,
    geographicFilter,
  ]);

  useEffect(() => {
    setBinPreview(null);
    setBinPreviewError(null);
    setBinPreviewLoading(false);
    setBinPreviewProgress(null);
    setInfrastructureBreaks(null);
    setContextBreaks(null);
    setUsingDefaultBins(true);
    setContextBinsMapVisible(false);
    setInfrastructureBinsMapVisible(false);
    removeEquityCustomBinPreviewLayers(mapViewRef.current);
  }, [binPreviewKey]);

  // Prefetch unit distributions as soon as the config is ready. Leaving Step 4
  // must not cancel or restart an in-flight/completed computation for the same key.
  useEffect(() => {
    if (!binPreviewKey) return;
    if (!infrastructureDataset || !contextDataset || !contextKind) return;
    if (binPreview) return;

    let cancelled = false;
    setBinPreviewLoading(true);
    setBinPreviewError(null);
    setBinPreviewProgress(null);

    (async () => {
      try {
        const geographyUnit =
          contextKind === "demographics"
            ? demographicsGeographyUnit
            : inferEquityGeographyUnit(contextDataset, contextKind);
        const computed = await computeInfrastructureEquityUnits({
          infrastructureDataset,
          contextDataset,
          infrastructureComfortSelection,
          contextFields: selectedContextFields,
          geographyUnit,
          geographicFilter,
          contextKind,
          onProgress: (completed, total) => {
            if (!cancelled) setBinPreviewProgress({ completed, total });
          },
        });
        if (cancelled) return;
        setBinPreview(computed);
      } catch (error) {
        if (!cancelled) {
          console.error("Equity bin preview failed", error);
          setBinPreview(null);
          setBinPreviewError(
            formatEquityAnalysisError(
              error,
              "Failed to compute distributions for bin setup."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setBinPreviewLoading(false);
          setBinPreviewProgress(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    binPreviewKey,
    binPreview,
    infrastructureDataset,
    contextDataset,
    contextKind,
    infrastructureComfortSelection,
    selectedContextFields,
    demographicsGeographyUnit,
    geographicFilter,
  ]);

  useEffect(() => {
    if (!binPreview) return;
    const defaults = buildEquityBivariateBreaks(binPreview.units, { binCount });
    setInfrastructureBreaks(defaults.infrastructure);
    setContextBreaks(defaults.context);
    setUsingDefaultBins(true);
  }, [binPreview, binCount]);

  const analysisConfigKey = useMemo(
    () =>
      JSON.stringify({
        geographicFilter,
        infrastructureDatasetId,
        infrastructureComfortSelection,
        contextKind,
        contextDatasetId,
        selectedContextFields,
        demographicsGeographyUnit,
        binCount,
        customBinMapping,
        infrastructureBreaks,
        contextBreaks,
      }),
    [
      geographicFilter,
      infrastructureDatasetId,
      infrastructureComfortSelection,
      contextKind,
      contextDatasetId,
      selectedContextFields,
      demographicsGeographyUnit,
      binCount,
      customBinMapping,
      infrastructureBreaks,
      contextBreaks,
    ]
  );

  const canRerunAnalysis =
    lastRunConfigKey != null && analysisConfigKey !== lastRunConfigKey;

  const contextLabelForBins = useMemo(() => {
    if (!contextDataset || !contextKind || selectedContextFields.length === 0) {
      return "Context indicator";
    }
    return formatCombinedContextIndicatorLabel(
      selectedContextFields,
      contextDataset,
      contextKind
    );
  }, [contextDataset, contextKind, selectedContextFields]);

  const infrastructureLabelForBins = useMemo(
    () => infrastructureMetricLabel(infrastructureComfortSelection),
    [infrastructureComfortSelection]
  );

  const handleInfrastructureBreaksChange = useCallback((breaks: number[]) => {
    setInfrastructureBreaks(breaks);
    setUsingDefaultBins(false);
  }, []);

  const handleContextBreaksChange = useCallback((breaks: number[]) => {
    setContextBreaks(breaks);
    setUsingDefaultBins(false);
  }, []);

  const handleCustomBinMappingChange = useCallback(
    (enabled: boolean) => {
      setCustomBinMapping(enabled);
      if (!enabled) {
        setUsingDefaultBins(true);
        setContextBinsMapVisible(false);
        setInfrastructureBinsMapVisible(false);
        removeEquityCustomBinPreviewLayers(mapViewRef.current);
        if (binPreview) {
          const defaults = buildEquityBivariateBreaks(binPreview.units, {
            binCount,
          });
          setInfrastructureBreaks(defaults.infrastructure);
          setContextBreaks(defaults.context);
        }
      }
    },
    [binPreview, binCount]
  );

  const syncCustomBinPreviewLayer = useCallback(
    async (options: {
      axis: "infrastructure" | "context";
      label: string;
      cuts: number[];
      requestId: number;
    }) => {
      if (!binPreview) return;
      const activeIdRef =
        options.axis === "context"
          ? contextBinSyncIdRef
          : infrastructureBinSyncIdRef;
      if (options.requestId !== activeIdRef.current) return;

      suppressingBinLayerWatchRef.current += 1;
      try {
        if (options.requestId !== activeIdRef.current) return;
        await addEquityCustomBinPreviewLayer({
          mapView: mapViewRef.current,
          axis: options.axis,
          label: options.label,
          units: binPreview.units,
          cuts: options.cuts,
          binCount,
        });
      } finally {
        suppressingBinLayerWatchRef.current -= 1;
      }
    },
    [binPreview, binCount]
  );

  const handleRemoveCustomBinPreview = useCallback(
    (axis: "infrastructure" | "context") => {
      if (axis === "context") {
        contextBinSyncIdRef.current += 1;
      } else {
        infrastructureBinSyncIdRef.current += 1;
      }
      suppressingBinLayerWatchRef.current += 1;
      try {
        removeEquityCustomBinPreviewLayer(mapViewRef.current, axis);
      } finally {
        suppressingBinLayerWatchRef.current -= 1;
      }
      if (axis === "context") {
        setContextBinsMapVisible(false);
      } else {
        setInfrastructureBinsMapVisible(false);
      }
    },
    []
  );

  const handleToggleContextBinsOnMap = useCallback(async () => {
    if (contextBinsMapVisible) {
      handleRemoveCustomBinPreview("context");
      return;
    }
    if (!binPreview || !contextBreaks) return;
    setBinsMapPreviewBusy(true);
    try {
      const requestId = ++contextBinSyncIdRef.current;
      await syncCustomBinPreviewLayer({
        axis: "context",
        label: contextLabelForBins,
        cuts: contextBreaks,
        requestId,
      });
      setContextBinsMapVisible(true);
    } finally {
      setBinsMapPreviewBusy(false);
    }
  }, [
    contextBinsMapVisible,
    handleRemoveCustomBinPreview,
    binPreview,
    contextBreaks,
    contextLabelForBins,
    syncCustomBinPreviewLayer,
  ]);

  const handleToggleInfrastructureBinsOnMap = useCallback(async () => {
    if (infrastructureBinsMapVisible) {
      handleRemoveCustomBinPreview("infrastructure");
      return;
    }
    if (!binPreview || !infrastructureBreaks) return;
    setBinsMapPreviewBusy(true);
    try {
      const requestId = ++infrastructureBinSyncIdRef.current;
      await syncCustomBinPreviewLayer({
        axis: "infrastructure",
        label: infrastructureLabelForBins,
        cuts: infrastructureBreaks,
        requestId,
      });
      setInfrastructureBinsMapVisible(true);
    } finally {
      setBinsMapPreviewBusy(false);
    }
  }, [
    infrastructureBinsMapVisible,
    handleRemoveCustomBinPreview,
    binPreview,
    infrastructureBreaks,
    infrastructureLabelForBins,
    syncCustomBinPreviewLayer,
  ]);

  // Keep active bin preview layers in sync with cut adjustments.
  useEffect(() => {
    if (!contextBinsMapVisible || !binPreview || !contextBreaks) return;
    const requestId = ++contextBinSyncIdRef.current;
    void syncCustomBinPreviewLayer({
      axis: "context",
      label: contextLabelForBins,
      cuts: contextBreaks,
      requestId,
    });
  }, [
    contextBinsMapVisible,
    binPreview,
    contextBreaks,
    contextLabelForBins,
    syncCustomBinPreviewLayer,
  ]);

  useEffect(() => {
    if (!infrastructureBinsMapVisible || !binPreview || !infrastructureBreaks) {
      return;
    }
    const requestId = ++infrastructureBinSyncIdRef.current;
    void syncCustomBinPreviewLayer({
      axis: "infrastructure",
      label: infrastructureLabelForBins,
      cuts: infrastructureBreaks,
      requestId,
    });
  }, [
    infrastructureBinsMapVisible,
    binPreview,
    infrastructureBreaks,
    infrastructureLabelForBins,
    syncCustomBinPreviewLayer,
  ]);

  // Deactivate toggle buttons if layers are removed outside the sidebar.
  useEffect(() => {
    if (!mapView?.map) return;
    const handle = mapView.map.allLayers.on("change", (event) => {
      if (suppressingBinLayerWatchRef.current > 0) return;
      for (const layer of event.removed) {
        const layerId = layer?.id != null ? String(layer.id) : "";
        if (layerId === EQUITY_CUSTOM_BIN_CONTEXT_LAYER_ID) {
          setContextBinsMapVisible(false);
        }
        if (layerId === EQUITY_CUSTOM_BIN_INFRASTRUCTURE_LAYER_ID) {
          setInfrastructureBinsMapVisible(false);
        }
      }
    });
    return () => {
      handle.remove();
    };
  }, [mapView]);

  const handleBinCountChange = useCallback((next: EquityBinCount) => {
    setBinCount(next);
    setUsingDefaultBins(true);
  }, []);

  const handleResetBreaksToQuantiles = useCallback(() => {
    if (!binPreview) return;
    const defaults = buildEquityBivariateBreaks(binPreview.units, { binCount });
    setInfrastructureBreaks(defaults.infrastructure);
    setContextBreaks(defaults.context);
    setUsingDefaultBins(true);
  }, [binPreview, binCount]);

  const handleStartSetup = useCallback(() => {
    setPhase("setup");
    setSetupStep("geographic");
    setAnalysisError(null);
    setGeographicFilter(createDefaultEquityGeographicFilter());
  }, []);

  const handleStartOver = useCallback(() => {
    setPhase("intro");
    setSetupStep("geographic");
    setAnalysisError(null);
    setInfrastructureDatasetId(null);
    setInfrastructureComfortSelection(DEFAULT_INFRASTRUCTURE_COMFORT_SELECTION);
    setContextKind(null);
    setContextDatasetId(null);
    setSelectedContextFields([]);
    setContextFieldOptions([]);
    setContextFieldsError(null);
    setGeographicFilter(createDefaultEquityGeographicFilter());
    setDemographicsGeographyUnit("tract");
    setBikeComfortVisible(false);
    setContextLayerVisible(false);
    setCustomBinMapping(false);
    setBinCount(DEFAULT_EQUITY_BIN_COUNT);
    setInfrastructureBreaks(null);
    setContextBreaks(null);
    setUsingDefaultBins(true);
    setBinPreview(null);
    setBinPreviewError(null);
    setBinPreviewLoading(false);
    setBinPreviewProgress(null);
    setContextBinsMapVisible(false);
    setInfrastructureBinsMapVisible(false);
    setLastRunConfigKey(null);
    removeEquityCustomBinPreviewLayers(mapViewRef.current);
    removeBikeComfortReferenceLayerFromMap(mapViewRef.current);
    removeContextReferenceLayerFromMap(mapViewRef.current);
    removeGeographicExtentPreviewLayerFromMap(mapViewRef.current);
    resetGeographicExtentPreviewCache();
  }, []);

  const handleBackToIntro = useCallback(() => {
    setPhase("intro");
    setSetupStep("geographic");
    setAnalysisError(null);
  }, []);

  const handleGeographicStepAdvance = useCallback(async () => {
    await zoomMapToEquityGeographicExtent(mapViewRef.current, geographicFilter);
    setSetupStep("infrastructure");
    setAnalysisError(null);
  }, [geographicFilter]);

  const handleGeographicLevelChange = useCallback(
    (level: EquityGeographicLevel) => {
      resetGeographicExtentPreviewCache();
      setGeographicFilter({
        level,
        placeName: null,
      });
      setAnalysisError(null);
    },
    []
  );

  const handleGeographicPlaceChange = useCallback((placeName: string) => {
    resetGeographicExtentPreviewCache();
    setGeographicFilter((prev) => ({ ...prev, placeName }));
    setAnalysisError(null);
  }, []);

  const handleContextKindChange = useCallback(
    (kind: EquityContextCategoryKind) => {
      setContextKind(kind);
      setContextDatasetId(null);
      setSelectedContextFields([]);
      setContextLayerVisible(false);
      setAnalysisError(null);
    },
    []
  );

  const handleScatterUnitClick = useCallback(
    (objectId: number) => {
      if (!activeAnalysisId) return;
      void highlightEquityAnalysisUnitOnMap(
        mapViewRef.current,
        activeAnalysisId,
        objectId
      );
    },
    [activeAnalysisId]
  );

  const handleRemovePinnedAnalysis = useCallback((analysisId: string) => {
    clearEquityAnalysisUnitHighlight();
    removePinnedEquityAnalysisFromMap(mapViewRef.current, analysisId);
    setPinnedAnalyses((prev) => {
      const next = prev.filter((entry) => entry.id !== analysisId);
      setActiveAnalysisId((current) => {
        if (current !== analysisId) return current;
        return next[next.length - 1]?.id ?? null;
      });
      return next;
    });
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    if (
      !mapView ||
      !infrastructureDataset ||
      !isInfrastructureComfortSelectionValid(infrastructureComfortSelection) ||
      !contextKind ||
      !contextDataset ||
      selectedContextFields.length === 0
    ) {
      return;
    }

    setAnalysisRunning(true);
    setRightCollapsed(false);
    setAnalysisError(null);
    setAnalysisProgress(null);

    try {
      const geographyUnit =
        contextKind === "demographics"
          ? demographicsGeographyUnit
          : inferEquityGeographyUnit(contextDataset, contextKind);
      const result = await runInfrastructureEquityAnalysis({
        infrastructureDataset,
        contextDataset,
        infrastructureComfortSelection,
        contextFields: selectedContextFields,
        geographyUnit,
        geographicFilter,
        contextKind,
        binCount,
        infrastructureBreaks: customBinMapping ? infrastructureBreaks : null,
        contextBreaks: customBinMapping ? contextBreaks : null,
        precomputed: binPreview,
        onProgress: (completed, total) =>
          setAnalysisProgress({ completed, total }),
      });

      const pinned = createPinnedEquityAnalysis(
        result,
        infrastructureDataset.id,
        contextDataset.id
      );

      await addPinnedEquityAnalysisToMap(mapView, pinned, contextDataset);

      setPinnedAnalyses((prev) => [...prev, pinned]);
      setActiveAnalysisId(pinned.id);
      setPhase("review");
      setRightCollapsed(false);
      setLastRunConfigKey(analysisConfigKey);
      setContextBinsMapVisible(false);
      setInfrastructureBinsMapVisible(false);
      removeEquityCustomBinPreviewLayers(mapView);
    } catch (error) {
      console.error("Equity analysis failed", error);
      setAnalysisError(formatEquityAnalysisError(error));
    } finally {
      setAnalysisRunning(false);
      setAnalysisProgress(null);
    }
  }, [
    mapView,
    infrastructureDataset,
    infrastructureComfortSelection,
    contextKind,
    contextDataset,
    selectedContextFields,
    demographicsGeographyUnit,
    geographicFilter,
    binCount,
    customBinMapping,
    infrastructureBreaks,
    contextBreaks,
    binPreview,
    analysisConfigKey,
  ]);

  return (
    <div
      id="infrastructure-equity-app"
      className="flex h-full min-h-0 w-full bg-white"
    >
      <InfrastructureEquityLeftSidebar
        isCollapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((prev) => !prev)}
        tree={tree}
        loading={catalogLoading}
        error={catalogError}
        phase={phase}
        setupStep={setupStep}
        onSetupStepChange={setSetupStep}
        onGeographicStepAdvance={handleGeographicStepAdvance}
        onStartSetup={handleStartSetup}
        onBackToIntro={handleBackToIntro}
        infrastructureDatasetId={infrastructureDatasetId}
        onInfrastructureDatasetChange={setInfrastructureDatasetId}
        infrastructureComfortSelection={infrastructureComfortSelection}
        onInfrastructureComfortSelectionChange={setInfrastructureComfortSelection}
        contextKind={contextKind}
        onContextKindChange={handleContextKindChange}
        contextDatasetId={contextDatasetId}
        onContextDatasetChange={setContextDatasetId}
        selectedContextFields={selectedContextFields}
        onSelectedContextFieldsChange={setSelectedContextFields}
        contextFieldOptions={contextFieldOptions}
        contextFieldsLoading={contextFieldsLoading}
        contextFieldsError={contextFieldsError}
        onRunAnalysis={handleRunAnalysis}
        analysisRunning={analysisRunning}
        analysisProgress={analysisProgress}
        analysisError={analysisError}
        canRunAnalysis={canRunAnalysis}
        geographicFilter={geographicFilter}
        onGeographicLevelChange={handleGeographicLevelChange}
        onGeographicPlaceChange={handleGeographicPlaceChange}
        jurisdictionPlaces={jurisdictionPlaces}
        jurisdictionPlacesLoading={jurisdictionPlacesLoading}
        pinnedAnalysisCount={pinnedAnalyses.length}
        bikeComfortVisible={bikeComfortVisible}
        onToggleBikeComfortVisible={() =>
          setBikeComfortVisible((prev) => !prev)
        }
        contextLayerVisible={contextLayerVisible}
        onToggleContextLayerVisible={() =>
          setContextLayerVisible((prev) => !prev)
        }
        demographicsGeographyUnit={demographicsGeographyUnit}
        onDemographicsGeographyUnitChange={setDemographicsGeographyUnit}
        demographicsGeographySupport={demographicsGeographySupport}
        demographicsIndicatorBlockGroupSupport={
          demographicsIndicatorBlockGroupSupport
        }
        binCount={binCount}
        onBinCountChange={handleBinCountChange}
        usingDefaultBins={usingDefaultBins}
        infrastructureBreaks={infrastructureBreaks}
        contextBreaks={contextBreaks}
        onInfrastructureBreaksChange={handleInfrastructureBreaksChange}
        onContextBreaksChange={handleContextBreaksChange}
        onResetBreaksToQuantiles={handleResetBreaksToQuantiles}
        binPreview={binPreview}
        binPreviewLoading={binPreviewLoading}
        binPreviewError={binPreviewError}
        binPreviewProgress={binPreviewProgress}
        infrastructureLabelForBins={infrastructureLabelForBins}
        contextLabelForBins={contextLabelForBins}
        onToggleContextBinsOnMap={handleToggleContextBinsOnMap}
        onToggleInfrastructureBinsOnMap={handleToggleInfrastructureBinsOnMap}
        contextBinsMapVisible={contextBinsMapVisible}
        infrastructureBinsMapVisible={infrastructureBinsMapVisible}
        binsMapPreviewBusy={binsMapPreviewBusy}
        customBinMapping={customBinMapping}
        onCustomBinMappingChange={handleCustomBinMappingChange}
        canRerunAnalysis={canRerunAnalysis}
        onStartOver={handleStartOver}
      />

      <div id="infrastructure-equity-map-area" className="relative min-w-0 flex-1">
        <DataQueryMap onMapViewReady={setMapView} />
        <DataQueryMapWidgets
          mapView={mapView}
          onEquityAnalysisRemove={handleRemovePinnedAnalysis}
          onEquityCustomBinPreviewRemove={handleRemoveCustomBinPreview}
          hideEsriLegend={!bikeComfortVisible && !contextLayerVisible}
          showLegendPanel={
            Boolean(activeAnalysis) ||
            bikeComfortVisible ||
            contextLayerVisible ||
            pinnedAnalyses.length > 0 ||
            contextBinsMapVisible ||
            infrastructureBinsMapVisible ||
            (phase === "setup" && setupStep === "geographic")
          }
          legendPanelTitle="Legend"
          customLegend={
            activeAnalysis ? (
              <EquityBivariateLegend
                contextLabel={formatEquityAnalysisContextMetricLabel(
                  activeAnalysis.result
                )}
                infrastructureLabel={
                  activeAnalysis.result.infrastructureMetricLabel
                }
                binCount={activeAnalysis.result.breaks.binCount}
                extentLabel={activeAnalysis.result.geographicLabel}
                runTitle={activeAnalysis.layerTitleMain}
              />
            ) : undefined
          }
        />
      </div>

      {(analysisRunning || pinnedAnalyses.length > 0) && (
        <InfrastructureEquityRightSidebar
          isCollapsed={rightCollapsed}
          onToggle={() => setRightCollapsed((prev) => !prev)}
          analysis={activeAnalysis?.result ?? null}
          pinnedAnalyses={pinnedAnalyses}
          activeAnalysisId={activeAnalysisId}
          onSelectAnalysis={setActiveAnalysisId}
          analysisRunning={analysisRunning}
          onScatterUnitClick={handleScatterUnitClick}
          mapView={mapView}
          resolveInfrastructureDataset={(datasetId) =>
            findDatasetInTree(tree, datasetId)
          }
        />
      )}
    </div>
  );
}
