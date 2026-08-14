import ExpoModulesCore
import PassKit

/// Presents Apple's purpose-built add-pass sheet for a signed `.pkpass`.
/// The generic share sheet is intentionally not used: `PKPass(data:)`
/// validates the bundle first and `PKAddPassesViewController` owns the
/// trusted Wallet confirmation experience.
private final class WalletPassPresentationDelegate: NSObject,
  PKAddPassesViewControllerDelegate
{
  private let pass: PKPass
  private let completion: (Bool) -> Void

  init(pass: PKPass, completion: @escaping (Bool) -> Void) {
    self.pass = pass
    self.completion = completion
  }

  func addPassesViewControllerDidFinish(
    _ controller: PKAddPassesViewController
  ) {
    controller.dismiss(animated: true) { [pass, completion] in
      completion(PKPassLibrary().containsPass(pass))
    }
  }
}

public final class WalletPassModule: Module {
  private var presentationDelegate: WalletPassPresentationDelegate?

  public func definition() -> ModuleDefinition {
    Name("WalletPass")

    AsyncFunction("canAddPassesAsync") { () -> Bool in
      PKAddPassesViewController.canAddPasses()
    }
    .runOnQueue(.main)

    AsyncFunction("addPassAsync") { (url: URL, promise: Promise) in
      guard self.presentationDelegate == nil else {
        promise.reject(
          "ERR_WALLET_BUSY",
          "Another Apple Wallet pass is already being presented."
        )
        return
      }

      guard PKAddPassesViewController.canAddPasses() else {
        promise.reject(
          "ERR_WALLET_UNAVAILABLE",
          "This device cannot add Apple Wallet passes."
        )
        return
      }

      do {
        let data = try Data(contentsOf: url)
        let pass = try PKPass(data: data)

        guard let controller = PKAddPassesViewController(pass: pass) else {
          promise.reject(
            "ERR_WALLET_INVALID_PASS",
            "Apple Wallet could not open this pass."
          )
          return
        }

        guard let currentViewController = self.appContext?.utilities?.currentViewController() else {
          promise.reject(
            "ERR_WALLET_NO_PRESENTER",
            "Apple Wallet could not be presented from this screen."
          )
          return
        }

        let presentationDelegate = WalletPassPresentationDelegate(pass: pass) {
          [weak self] wasAdded in
          self?.presentationDelegate = nil
          promise.resolve(wasAdded ? "added" : "cancelled")
        }

        self.presentationDelegate = presentationDelegate
        controller.delegate = presentationDelegate
        currentViewController.present(controller, animated: true)
      } catch {
        promise.reject(
          "ERR_WALLET_INVALID_PASS",
          "Apple Wallet could not verify this pass."
        )
      }
    }
    .runOnQueue(.main)
  }

}
