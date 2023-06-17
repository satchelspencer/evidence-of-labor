{
  "targets": [
    {
      "target_name": "video",
      "sources": [
        "native/addon.cc",
        "native/Mat.cc",
      ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
      "xcode_settings": {
        "OTHER_CFLAGS": [
          "-std=c++17",
          "-stdlib=libc++",
          "-Wno-return-type-c-linkage",
          "-Wno-sign-compare",
          "-Wno-ignored-qualifiers",
          "-O3"
        ],
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "MACOSX_DEPLOYMENT_TARGET": "12.6",
        "OTHER_LDFLAGS": ["-w"]
      },
      "libraries": [
        "-L/opt/homebrew/Cellar/opencv/4.7.0_6/lib/ -lopencv_core -lopencv_highgui -lopencv_imgcodecs -lopencv_imgproc -lopencv_features2d -lopencv_calib3d -lopencv_photo -lopencv_objdetect -lopencv_ml -lopencv_video -lopencv_videoio -lopencv_videostab -lopencv_dnn -lopencv_face -lopencv_tracking -lopencv_xfeatures2d -lopencv_ximgproc -Wl,-rpath,/opt/homebrew/Cellar/opencv/4.7.0_6/lib/",
			  "-framework opencl"
      ],
      "include_dirs": [
        "native", 
        "/opt/homebrew/Cellar/opencv/4.7.0_6/include/opencv4",
        "<!@(node -p \"require('node-addon-api').include\")"],
    }
  ]
}
