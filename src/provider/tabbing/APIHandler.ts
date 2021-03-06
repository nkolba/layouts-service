
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {ApplicationUIConfig, DropPosition, TabIdentifier, TabProperties, TabWindowOptions} from '../../client/types';

import {Tab} from './Tab';
import {TabGroup} from './TabGroup';
import {TabService} from './TabService';
import {ejectTab} from './TabUtilities';

/**
 * Handles all calls from tab api to service
 */
export class APIHandler {
    /**
     * The tab service itself
     */
    private mTabService: TabService;

    /**
     * @constructor Constructor for the TabAPIActionProcessor
     */
    constructor(service: TabService) {
        this.mTabService = service;
    }

    /**
     * If a custom tab-strip UI is being used - this sets the URL for the tab-strip.
     * This binding happens on the application level.  An application cannot have different windows using different tabbing UI.
     */
    public setTabClient(payload: {config: TabWindowOptions, id: Identity}) {
        if (this.mTabService.applicationConfigManager.exists(payload.id.uuid)) {
            return Promise.reject('Configuration already set!');
        }

        return this.mTabService.applicationConfigManager.addApplicationUIConfig(payload.id.uuid, payload.config);
    }

    /**
     * Allows a window to opt-out of this service. This will disable all tabbing-related functionality for the given window.
     */
    public async deregister(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);

        if (group) {
            return await group.removeTab(window, false, true);
        }

        return false;
    }


    /**
     * Returns array of window references for tabs belonging to the tab group of the provided window context.
     *
     * If no Identity is provided as an argument, the current window context will be used.
     *
     * If there is no tab group associated with the window context, will resolve to null.
     */
    public getTabs(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);

        if (!group) {
            return null;
        }

        return group.tabs.map(tab => tab.ID);
    }

    /**
     * Given a set of windows, will create a tab group construct and UI around them.  The bounds and positioning of the first (applicable) window in the set
     * will be used as the seed for the tab UI properties.
     */
    public async createTabGroup(windows: TabIdentifier[]) {
        return this.mTabService.createTabGroupWithTabs(windows);
    }

    /**
     * Adds current window context (or window specified in second arg)  to the tab group of the target window (first arg).
     *
     * Will reject with an error if the TabClient of the target and context tab group do not match.
     *
     * The added tab will be brought into focus.
     */
    public async addTab(payload: {targetWindow: TabIdentifier, windowToAdd: TabIdentifier}) {
        const group = this.mTabService.getTabGroupByApp(payload.targetWindow);

        if (!group) {
            return Promise.reject('Target Window not in a group.  Try createTabGroup instead.');
        }

        if (this.mTabService.applicationConfigManager.compareConfigBetweenApplications(payload.targetWindow.uuid, payload.windowToAdd.uuid)) {
            return group.addTab(await new Tab({tabID: payload.windowToAdd}).init());
        } else {
            return Promise.reject('Rejected: Tabs are of different URLs!');
        }
    }

    /**
     * Removes the specified tab from its tab group.
     * Uses current window context by default
     */
    public removeTab(window: TabIdentifier): Promise<void> {
        return ejectTab({name: window.name, uuid: window.uuid});
    }

    /**
     * Brings the specified tab to the front of the set.
     */
    public setActiveTab(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);

        if (!group) {
            return Promise.reject('No group found');
        }

        return group.switchTab(window);
    }
    /**
     * Closes the tab for the window context and removes it from the associated tab group.
     */
    public closeTab(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);

        if (!group) {
            return Promise.reject('No group found');
        }

        return group.removeTab(window, true, true);
    }
    /**
     * Minimizes the tab group for the window context.
     */
    public minimizeTabGroup(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);
        if (!group) {
            return Promise.reject('No group found');
        }

        return group.window.minimizeGroup();
    }
    /**
     * Maximizes the tab group for the window context.
     */
    public maximizeTabGroup(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);
        if (!group) {
            return Promise.reject('No group found');
        }

        return group.window.maximizeGroup();
    }
    /**
     * Closes the tab group for the window context.
     */
    public closeTabGroup(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);
        if (!group) {
            return Promise.reject('No group found');
        }

        return this.mTabService.removeTabGroup(group.ID, true);
    }
    /**
     * Restores the tab group for the window context to its normal state.
     */
    public async restoreTabGroup(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);
        if (!group) {
            return Promise.reject('No group found');
        }

        if (await group.window.getState() === 'minimized') {
            return group.window.restore();
        } else {
            return group.window.restoreGroup();
        }
    }
    /**
     * Resets the tabs to the order provided.  The length of tabs Identity array must match the current number of tabs, and each current tab must appear in the
     * array exactly once to be valid.  If the input isn’t valid, the call will reject and no change will be made.
     */
    public reorderTabs(newOrdering: TabIdentifier[], id: Identity) {
        const group = this.mTabService.getTabGroupByApp(id as TabIdentifier) || this.mTabService.getTabGroup(id.name!);

        if (!group) {
            return Promise.reject('No group found');
        }

        return group.reOrderTabArray(newOrdering);
    }

    /**
     * Updates a Tabs Properties on the Tab strip.
     */
    public updateTabProperties(payload: {window: TabIdentifier, properties: TabProperties}) {
        const tab = this.mTabService.getTab(payload.window);

        if (!tab) {
            return Promise.reject('No Tab Found');
        }

        return tab.updateTabProperties(payload.properties);
    }

    /**
     * Starts the HTML5 Dragging Sequence
     */
    public startDrag(payload: {}, id: TabIdentifier) {
        // TODO assign uuid, name from provider
        this.mTabService.dragWindowManager.showWindow(id);
    }

    /**
     * Ends the HTML5 Dragging Sequence.
     */
    public async endDrag(payload: {event: DropPosition, window: TabIdentifier}) {
        const tabGroup: TabGroup|undefined = this.mTabService.getTabGroupByApp(payload.window);

        if (!tabGroup) {
            return Promise.reject('No group found');
        }

        this.mTabService.dragWindowManager.hideWindow();

        return ejectTab({uuid: payload.window.uuid, name: payload.window.name, screenX: payload.event.screenX, screenY: payload.event.screenY}, tabGroup);
    }
}
