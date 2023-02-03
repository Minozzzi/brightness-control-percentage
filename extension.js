const { Clutter, Gio, St, GObject } = imports.gi

const Main = imports.ui.main
const ExtensionUtils = imports.misc.extensionUtils
const { loadInterfaceXML } = imports.misc.fileUtils

const BUS_NAME = "org.gnome.SettingsDaemon.Power"
const OBJECT_PATH = "/org/gnome/SettingsDaemon/Power"

const Me = ExtensionUtils.getCurrentExtension()
const BrightnessInterface = loadInterfaceXML(
  "org.gnome.SettingsDaemon.Power.Screen"
)
const BrightnessProxy = Gio.DBusProxy.makeProxyWrapper(BrightnessInterface)

const BrightnessIndicator = GObject.registerClass(
  class BrightnessIndicator extends St.BoxLayout {
    _init() {
      super._init({
        reactive: true,
        visible: true,
      })

      this._proxy = new BrightnessProxy(
        Gio.DBus.session,
        BUS_NAME,
        OBJECT_PATH,
        (proxy, error) => {
          if (error) log("error:", error.message)
          else this._proxy.connect("g-properties-changed", () => this._sync())
          this._sync()
        }
      )

      this._addIcon()
    }

    _addIcon() {
      const icon = new St.Icon(
        {
          gicon: new Gio.ThemedIcon({ name: "display-brightness-symbolic" }),
          style_class: "system-status-icon",
        },
        "_brightnessIndicator"
      )

      this.add_actor(icon)

      this._outputPercentageLabel = new St.Label({
        y_expand: true,
        y_align: Clutter.ActorAlign.CENTER,
      })

      this.add(this._outputPercentageLabel)
      this.set_child_at_index(this._outputPercentageLabel, 1)
      this.add_style_class_name("power-status")
    }

    _updateBrightness(brightness) {
      this._outputPercentageLabel.text = `${brightness}%`
    }

    _sync() {
      this._updateBrightness(this._proxy.Brightness)
    }
  }
)

class Extension {
  constructor(uuid) {
    this._uuid = uuid
  }

  enable() {
    log(`enabling ${Me.metadata.name}`)

    this._brightnessIndicator = new BrightnessIndicator()

    Main.panel.statusArea.aggregateMenu._indicators.insert_child_at_index(
      this._brightnessIndicator,
      7
    )
  }

  disable() {
    log(`disabling ${Me.metadata.name}`)

    this._brightnessIndicator.destroy()
    this._brightnessIndicator = null
  }
}

function init() {
  log(`initializing ${Me.metadata.name}`)

  return new Extension(Me.metadata.uuid)
}
