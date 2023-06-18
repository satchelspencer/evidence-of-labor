#include "VideoCapture.h"
#include "Mat.h"

VideoCapture::VideoCapture(const Napi::CallbackInfo& info) : Napi::ObjectWrap<VideoCapture>(info) {
  if(info[0].IsNumber()){
    int deviceId = info[0].As<Napi::Number>().Int32Value();
    this->cap = new cv::VideoCapture(deviceId);
  }else{
    std::string fileName = std::string(info[0].As<Napi::String>());
    this->cap = new cv::VideoCapture(fileName);
  }
};

Napi::FunctionReference VideoCapture::constructor;

Napi::Object VideoCapture::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "VideoCapture", {
    InstanceMethod("read", &VideoCapture::read),
    InstanceMethod("release", &VideoCapture::release)
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("VideoCapture", func);

  return exports;
}

void VideoCapture::read(const Napi::CallbackInfo &info){
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  this->cap->read(*dest->mat);
}

void VideoCapture::release(const Napi::CallbackInfo &info){
  this->cap->release();
}