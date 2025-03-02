"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debounce_1 = __importDefault(require("debounce"));
const electron_store_1 = __importDefault(require("electron-store"));
const electron_1 = require("electron");
/**
 * Store and restore your Electron Window's Size and Position.
 * @example
    ```
    const winState = new WinState({
        defaultWidth: 800,
        defaultHeight: 600,
        // other winState options, see below
    })

    const browserWindow = new BrowserWindow({
        ...winState.winOptions,
        // your normal BrowserWindow options...
    })

    // Attach the required event listeners
    winState.manage(this.browserWindow)
    ```
 */
class WinState {
    constructor(options) {
        const defaultOptions = {
            defaultWidth: 600,
            defaultHeight: 800,
            defaultFrame: true,
            storeFrameOption: options.defaultFrame !== undefined || false,
            dev: false,
            debounce: 500,
            electronStoreOptions: {
                name: 'window-state'
            },
            addMethods: true,
            store: undefined
        };
        this.opts = Object.assign({}, defaultOptions, options);
        this.store = this.opts.store ? this.opts.store : new electron_store_1.default(this.opts.electronStoreOptions);
        this.state = this.getState();
    }
    getState() {
        const stored = this.store.store;
        const defaults = Object.assign({ width: this.opts.defaultWidth, height: this.opts.defaultHeight }, (this.opts.storeFrameOption && { frame: this.opts.defaultFrame }));
        return Object.assign({}, defaults, stored);
    }
    saveState() {
        this.store.set(this.state);
    }
    /**
     * Change the stored frame option
     *
     * Note: You need to recreate the window for this to take effect
     */
    changeFrame(value) {
        this.state.frame = value;
        this.saveState();
    }
    /**
     * Reset the stored window size and position
     */
    reset() {
        this.store.clear();
    }
    /**
     * Attach event listeners to the BrowserWindow.
     *
     * Will listen to the `resize`, `move`, `close` and `closed event`.
     *
     * By default the changes will only be stored on the `close` and `closed` event.
     * Use the `dev` option to store the changes on `resize` and `move` as well.
     * @param win
     */
    manage(win) {
        this.win = win;
        this.win.on('maximize', (0, debounce_1.default)(() => this.changeHandler(), this.opts.debounce));
        this.win.on('resize', (0, debounce_1.default)(() => this.changeHandler(), this.opts.debounce));
        this.win.on('move', (0, debounce_1.default)(() => this.changeHandler(), this.opts.debounce));
        this.win.on('close', () => this.closeHandler());
        this.win.on('closed', () => this.closeHandler());
        // Add a reset method to the window
        if (this.opts.addMethods) {
            this.win.resetWindowToDefault = () => {
                var _a;
                (_a = this.win) === null || _a === void 0 ? void 0 : _a.setSize(this.opts.defaultWidth, this.opts.defaultHeight);
                this.reset();
            };
            this.win.setFramed = (value) => {
                this.changeFrame(value);
            };
            this.win.getStoredWinOptions = () => {
                return this.winOptions;
            };
        }
    }
    /**
     * Remove all attached event listeners
     */
    unmanage() {
        if (this.win) {
            this.win.removeListener('resize', (0, debounce_1.default)(() => this.changeHandler(), this.opts.debounce));
            this.win.removeListener('move', (0, debounce_1.default)(() => this.changeHandler(), this.opts.debounce));
            this.win.removeListener('close', () => this.closeHandler());
            this.win.removeListener('closed', () => this.closeHandler());
            this.win = undefined;
        }
    }
    changeHandler() {
        try {
            if (!this.win)
                return;
            const winBounds = this.win.getBounds();
            if (this.isNormal()) {
                this.state.x = winBounds.x >= 0 ? winBounds.x : 0;
                this.state.y = winBounds.y >= 0 ? winBounds.y : 0;
                this.state.width = winBounds.width;
                this.state.height = winBounds.height;
            }
            // Not working, reference: https://git.io/JZ3n5
            /* this.state.isMaximized = this.win.isMaximized()
            this.state.isFullScreen = this.win.isFullScreen() */
            if (this.opts.dev) {
                this.saveState();
            }
        }
        catch (err) {
            // Don't throw an error when window was closed
        }
    }
    closeHandler() {
        // Unregister listeners and save state
        this.unmanage();
        this.saveState();
    }
    isNormal() {
        var _a, _b;
        return !((_a = this.win) === null || _a === void 0 ? void 0 : _a.isMinimized()) && !((_b = this.win) === null || _b === void 0 ? void 0 : _b.isFullScreen());
    }
    /**
     * Create a new [BrowserWindow](https://www.electronjs.org/docs/api/browser-window) with the restored window size and position.
     *
     * Will attach the event listeners automatically.
     * @param options Options for the new BrowserWindow as well as [electron-win-state](https://github.com/BetaHuhn/electron-win-state) itself.
     * @returns A new BrowserWindow
     * @example
        ```
        import WinState from 'electron-win-state'

        const browserWindow = WinState.createBrowserWindow({
            width: 800,
            height: 600,
            // your normal BrowserWindow options...
        })
        ```
     */
    static createBrowserWindow(options) {
        var _a, _b, _c;
        // If storeFrameOption is missing and the defaultFrame property exists enable storeFrameOption
        if (((_a = options.winState) === null || _a === void 0 ? void 0 : _a.storeFrameOption) === undefined) {
            options.winState = Object.assign(Object.assign({}, options.winState), { storeFrameOption: ((_b = options.winState) === null || _b === void 0 ? void 0 : _b.defaultFrame) !== undefined });
        }
        // Parse winState specific options from options
        const winStateOpts = Object.assign({}, Object.assign({ defaultWidth: options.width, defaultHeight: options.height }, (((_c = options.winState) === null || _c === void 0 ? void 0 : _c.storeFrameOption) && { defaultFrame: options.frame })), options.winState);
        const winState = new WinState(winStateOpts);
        // Cleanup options object
        delete options.winState;
        // Create a new BrowserWindow with the provided options and the current winState
        const win = new electron_1.BrowserWindow(Object.assign(Object.assign({}, options), winState.winOptions));
        winState.manage(win);
        return win;
    }
    /**
     * The current window size and position
     */
    get winOptions() {
        return Object.assign(Object.assign({ width: this.width, height: this.height }, (this.opts.storeFrameOption && { frame: this.frame })), { x: this.x, y: this.y });
    }
    /**
     * The current window width
     */
    get width() {
        return this.state.width;
    }
    /**
     * The current window height
     */
    get height() {
        return this.state.height;
    }
    /**
     * If the window has a frame
     */
    get frame() {
        return this.state.frame;
    }
    /**
     * The current window x position
     */
    get x() {
        return this.state.x;
    }
    /**
     * The current window y position
     */
    get y() {
        return this.state.y;
    }
}
exports.default = WinState;
