#include "Mat.h"

Mat::Mat(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Mat>(info) {
  if(info.Length() == 0)
    this->mat = new cv::Mat();
  else
    this->mat = new cv::Mat(
      info[1].As<Napi::Number>().Int32Value(),
      info[0].As<Napi::Number>().Int32Value(),
      info[2].As<Napi::Number>().Int32Value()
    );
};

Napi::FunctionReference Mat::constructor;

Napi::Object Mat::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Mat", {
    InstanceMethod("show", &Mat::show),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Mat", func);

  return exports;
}

void Mat::show(const Napi::CallbackInfo &info){
  cv::imshow("test", * this->mat);
  cv::waitKey(0);
}