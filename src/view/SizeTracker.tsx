import * as React from "react";
import { Rect } from "../Rect";
import { ErrorBoundary } from "./ErrorBoundary";
import { I18nLabel } from "../I18nLabel";
import { LayoutInternal } from "./Layout";
import { TabNode } from "../model/TabNode";

export interface ISizeTrackerProps {
    layout: LayoutInternal;
    node: TabNode;
    rect: Rect;
    visible: boolean;
    forceRevision: number;
    tabsRevision: number;
}

export const SizeTracker = React.memo(({ layout, node }: ISizeTrackerProps) => {
    // Get the factory function and model
    const factory = layout.getFactory();
    const model = node.getModel();

    // Get or create tab content using model's shared cache
    let tabContent = model.getTabContent(node.getId());
    // Create new content with memoization to prevent unnecessary re-renders
    if (!tabContent) {
        tabContent = factory(node);
        model.setTabContent(node.getId(), tabContent);
    }
    return (
        <ErrorBoundary message={layout.i18nName(I18nLabel.Error_rendering_component)} retryText={layout.i18nName(I18nLabel.Error_rendering_component_retry)}>
            {tabContent}
        </ErrorBoundary>
    );
}, arePropsEqual);

// only re-render if visible && (size changed or forceRevision changed or tabsRevision changed)
function arePropsEqual(prevProps: ISizeTrackerProps, nextProps: ISizeTrackerProps) {
    const reRender = nextProps.visible && (!prevProps.rect.equalSize(nextProps.rect) || prevProps.forceRevision !== nextProps.forceRevision || prevProps.tabsRevision !== nextProps.tabsRevision);
    return !reRender;
}
