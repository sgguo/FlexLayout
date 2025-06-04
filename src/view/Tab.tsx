import * as React from "react";
import { TabNode } from "../model/TabNode";
import { TabSetNode } from "../model/TabSetNode";
import { CLASSES } from "../Types";
import { LayoutInternal } from "./Layout";
import { BorderNode } from "../model/BorderNode";
import { Actions } from "../model/Actions";

/** @internal */
export interface ITabProps {
    layout: LayoutInternal;
    node: TabNode;
    selected: boolean;
    path: string;
}

/** @internal */
export const Tab = (props: ITabProps) => {
    const { layout, selected, node, path } = props;
    const selfRef = React.useRef<HTMLDivElement | null>(null);
    const firstSelect = React.useRef<boolean>(true);

    const parentNode = node.getParent() as TabSetNode | BorderNode;
    const rect = parentNode.getContentRect()!;

    React.useLayoutEffect(() => {
        const element = node.getMoveableElement()!;
        selfRef.current!.appendChild(element);
        node.setMoveableElement(element);

        const handleScroll = () => {
            node.saveScrollPosition();
        };

        // keep scroll position
        element.addEventListener('scroll', handleScroll);

        // listen for clicks to change active tabset
        selfRef.current!.addEventListener("pointerdown", onPointerDown);

        return () => {
            element.removeEventListener('scroll', handleScroll);
            if (selfRef.current) {
                selfRef.current.removeEventListener("pointerdown", onPointerDown);
            }
            node.setVisible(false);
        }
    }, []);

    React.useEffect(() => {
        if (node.isSelected()) {
            if (firstSelect.current) {
                node.restoreScrollPosition(); // if window docked back in
                firstSelect.current = false;
            }
        }
    });

    // Listen for tab close to clear cache
    React.useEffect(() => {
        const handleClose = () => {
            layout.removeTabContentFromCache(node.getId());
        };
        node.addListener("close", handleClose);
        return () => {
            // Remove listener if component unmounts
            // (not strictly necessary for one-time close, but good practice)
        };
    }, [layout, node]);

    const onPointerDown = () => {
        const parent = node.getParent()!; // cannot use parentNode here since will be out of date
        if (parent instanceof TabSetNode) {
            if (!parent.isActive()) {
                layout.doAction(Actions.setActiveTabset(parent.getId(), layout.getWindowId()));
            }
        }
    };

    node.setRect(rect); // needed for resize event
    const cm = layout.getClassName;
    const style: Record<string, any> = {};

    rect.styleWithPosition(style);

    let overlay = null;

    if (selected) {
        node.setVisible(true);
        if (document.hidden && node.isEnablePopoutOverlay()) {
            const overlayStyle: Record<string, any> = {};
            rect.styleWithPosition(overlayStyle);
            overlay = (<div style={overlayStyle} className={cm(CLASSES.FLEXLAYOUT__TAB_OVERLAY)}></div>)
        }
    } else {
        style.display = "none";
        node.setVisible(false);
    }

    if (parentNode instanceof TabSetNode) {
        if (node.getModel().getMaximizedTabset(layout.getWindowId()) !== undefined) {
            if (parentNode.isMaximized()) {
                style.zIndex = 10;
            } else {
                style.display = "none";
            }
        }
    }

    if (parentNode instanceof BorderNode) {
        if (!parentNode.isShowing()) {
            style.display = "none";
        }
    }

    let className = cm(CLASSES.FLEXLAYOUT__TAB);
    if (parentNode instanceof BorderNode) {
        className += " " + cm(CLASSES.FLEXLAYOUT__TAB_BORDER);
        className += " " + cm(CLASSES.FLEXLAYOUT__TAB_BORDER_ + parentNode.getLocation().getName());
    }

    if (node.getContentClassName() !== undefined) {
        className += " " + node.getContentClassName();
    }

    // Get the factory function
    const factory = layout.getFactory();
    
    // Simple cache based on tab ID since we only have one layout
    let tabContent = layout.tabContentCache.get(node.getId());
    if (!tabContent) {
        // Create new content with memoization to prevent unnecessary re-renders
        tabContent = React.createElement(
            React.memo(
                () => React.createElement(
                    React.Fragment,
                    null,
                    factory(node)
                )
            ),
            { key: node.getId() }
        );
        layout.tabContentCache.set(node.getId(), tabContent);
    }

    // Cleanup cache on unmount - not needed for single layout
    // Cache cleanup is handled by the close event listener above

    return (
        <>
            {overlay}
            <div
                ref={selfRef}
                style={style}
                className={className}
                data-layout-path={path}
            >
                {tabContent}
            </div>
        </>
    );
};


