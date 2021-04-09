/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React, { useEffect } from "react";
import { SectionMarker } from "@bentley/hypermodeling-frontend";
import { Button, Toggle } from "@bentley/ui-core";
import { useActiveIModelConnection, useActiveViewport } from "@bentley/ui-framework";
import { IModelApp, ViewState } from "@bentley/imodeljs-frontend";
import HyperModelingApi from "./HyperModelingApi";
import { assert, Id64String } from "@bentley/bentleyjs-core";
import { AbstractWidgetProps, StagePanelLocation, StagePanelSection, UiItemsProvider } from "@bentley/ui-abstract";
import "./HyperModeling.scss";

interface Previous {
  /** The 3d view. */
  view: ViewState;
  /** The Id of the previously-active section marker. */
  markerId: Id64String;
}

export const HyperModelingWidget: React.FunctionComponent = () => {
  const iModelConnection = useActiveIModelConnection();
  const viewport = useActiveViewport();

  const [toggle2dGraphics, setToggle2dGraphics] = React.useState<boolean>();
  const [activeMarker, setActiveMarker] = React.useState<SectionMarker>();
  const [previous, setPrevious] = React.useState<Previous>();

  useEffect(() => {
    if (undefined !== activeMarker) {
      setActiveMarker(activeMarker);
    }
  }, [activeMarker]);

  useEffect(() => {
    setPrevious(previous);
  }, [previous]);

  useEffect(() => {
    if (viewport) {
      HyperModelingApi.enableHyperModeling(viewport)
        .then(() => {
          HyperModelingApi.markerHandler.onActiveMarkerChanged.addListener((marker) => {
            setActiveMarker(marker);
          });
        });
      return () => { HyperModelingApi.disableHyperModeling(viewport); }
    }
    return;
  }, [viewport]);

  const onClickReturnTo3D = async () => {
    if (viewport && previous) {
      await HyperModelingApi.switchTo3d(viewport, previous.view, previous.markerId);
      setPrevious(undefined);
    }
  };

  const onClickSelectNewMarker = () => {
    assert(undefined !== viewport);
    HyperModelingApi.clearActiveMarker(viewport);
  };

  const onClickSwitchTo2d = async (which: "sheet" | "drawing") => {
    const marker = activeMarker;
    assert(undefined !== viewport && undefined !== marker);

    const view = viewport.view;
    if (await HyperModelingApi.switchTo2d(viewport, marker, which))
      setPrevious({ view, markerId: marker.state.id });
  };

  const onToggle2dGraphics = (toggle: boolean) => {
    if (iModelConnection) {
      const vp = IModelApp.viewManager.selectedView;
      if (vp) {
        HyperModelingApi.toggle2dGraphics(toggle);
      }
      setToggle2dGraphics(toggle);
    }
  };

  const switchToDrawingView = async () => {
    return onClickSwitchTo2d("drawing");
  };

  const switchToSheetView = async () => {
    return onClickSwitchTo2d("sheet");
  };

  return (
    <div className="sample-options">
      {(previous) && (
        <div className="sample-options-3col-even">
          <span />
          <Button onClick={onClickReturnTo3D}>Return to 3d view</Button>
        </div>
      )}
      {(!previous) && (
        <div className="sample-options-3col-even">
          <span>Display 2d graphics</span>
          <Toggle isOn={toggle2dGraphics} onChange={onToggle2dGraphics} disabled={!activeMarker} />
          <span />
          <Button onClick={switchToDrawingView} disabled={!activeMarker}>View section drawing</Button>
          <Button onClick={switchToSheetView} disabled={!activeMarker?.state.viewAttachment}>View on sheet</Button>
          <Button onClick={onClickSelectNewMarker} disabled={!activeMarker}>Select new marker</Button>
        </div>
      )}
    </div>
  );
};


export class HypermodelingWidgetProvider implements UiItemsProvider {
  public readonly id: string = "HypermodelingWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection): ReadonlyArray<AbstractWidgetProps> {
    const widgets: AbstractWidgetProps[] = [];
    if (location === StagePanelLocation.Right) {
      widgets.push(
        {
          id: "HypermodellingWidget",
          label: "Hypermodelling Controls",
          // eslint-disable-next-line react/display-name
          getWidgetContent: () => <HyperModelingWidget />,
        }
      );
    }
    return widgets;
  }
}