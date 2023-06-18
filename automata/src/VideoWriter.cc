#include "VideoWriter.h"
#include "Mat.h"

VideoWriter::VideoWriter(const Napi::CallbackInfo& info) : Napi::ObjectWrap<VideoWriter>(info) {
  std::string fileName = std::string(info[0].As<Napi::String>());
  int height = info[2].As<Napi::Number>().Int32Value();
  int width = info[1].As<Napi::Number>().Int32Value();
  
  this->writer = new cv::VideoWriter(
    fileName,
    cv::VideoWriter::fourcc('P','I','M','1'),
    30,
    cv::Size(width,height),
    true
  );
};

Napi::FunctionReference VideoWriter::constructor;

Napi::Object VideoWriter::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "VideoWriter", {
    InstanceMethod("write", &VideoWriter::write),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("VideoWriter", func);

  return exports;
}

void VideoWriter::write(const Napi::CallbackInfo &info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  this->writer->write(* src->mat);
}
