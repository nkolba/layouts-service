import {TabIdentifier} from '../../client/types';

import {AsyncWindow} from './asyncWindow';

const DRAG_WINDOW_URL = (() => {
    let providerLocation = window.location.href;

    if (providerLocation.indexOf('http://localhost') === 0) {
        // Work-around for fake provider used within test runner
        providerLocation = providerLocation.replace('/test', '/provider');
    }

    // Locate the default tabstrip HTML page, relative to the location of the provider
    return providerLocation.replace('provider.html', 'tabbing/drag.html');
})();

/**
 * Handles the Drag Window which appears when API drag and drop is initialized.
 */
export class DragWindowManager extends AsyncWindow {
    // tslint:disable-next-line:no-any setTimout return Type is confused by VSC
    private _hideTimeout: any;

    constructor() {
        super();
    }

    /**
     * Initializes Async Methods required by this class.
     */
    public async init(): Promise<void> {
        await this._createDragWindow();
    }

    /**
     * Shows the drag window overlay.
     */
    public showWindow(source: TabIdentifier): void {
        this._window.show();
        this._window.focus();

        // Bring source window in front of invisible window
        fin.desktop.Window.wrap(source.uuid, source.name).focus();


        this._hideTimeout = setTimeout(() => {
            this.hide();
        }, 15000);
    }

    /**
     * Hides the drag window overlay.
     */
    public hideWindow(): void {
        this._window.hide();
        clearTimeout(this._hideTimeout);
    }

    /**
     * Creates the drag overlay window.
     */
    private _createDragWindow(): Promise<void> {
        return new Promise((res, rej) => {
            this._window = new fin.desktop.Window(
                {
                    name: 'TabbingDragWindow',
                    url: DRAG_WINDOW_URL,
                    defaultHeight: 1,
                    defaultWidth: 1,
                    defaultLeft: 0,
                    defaultTop: 0,
                    saveWindowState: false,
                    autoShow: true,
                    opacity: 0.01,
                    frame: false,
                    waitForPageLoad: false,
                    alwaysOnTop: false,
                    showTaskbarIcon: false,
                    // @ts-ignore smallWidnow flag is valid
                    smallWindow: true
                },
                () => {
                    this._window.resizeTo(screen.width, screen.height, 'top-left');
                    this._window.hide();
                    res();
                },
                rej);
        });
    }
}
