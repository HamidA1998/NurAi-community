Pod::Spec.new do |s|
  s.name           = 'AthanAlarm'
  s.version        = '1.0.0'
  s.summary        = 'Full-length athan playback via iOS 26 AlarmKit'
  s.description    = 'Schedules prayer-time alarms with AlarmKit so the full adhan plays like a Clock alarm, even in silent mode.'
  s.author         = 'NurAI'
  s.homepage       = 'https://nurai.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
