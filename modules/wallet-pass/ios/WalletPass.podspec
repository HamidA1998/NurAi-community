Pod::Spec.new do |s|
  s.name           = 'WalletPass'
  s.version        = '1.0.0'
  s.summary        = 'Native Apple Wallet pass presentation for NurAI'
  s.description    = 'Validates signed pkpass data and presents Apple PassKit add-pass UI.'
  s.author         = 'NurAI'
  s.homepage       = 'https://nurai.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'PassKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
