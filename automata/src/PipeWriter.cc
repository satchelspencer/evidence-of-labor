#include "PipeWriter.h"
#include "Mat.h"

PipeWriter::PipeWriter(const Napi::CallbackInfo& info) : Napi::ObjectWrap<PipeWriter>(info) {
  std::string fileName = std::string(info[0].As<Napi::String>());
  mkfifo(fileName.c_str(), 0666);
  this->fd = open(fileName.c_str(),O_WRONLY);
};

Napi::FunctionReference PipeWriter::constructor;

Napi::Object PipeWriter::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "PipeWriter", {
    InstanceMethod("write", &PipeWriter::writep),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("PipeWriter", func);

  return exports;
}

void PipeWriter::writep(const Napi::CallbackInfo &info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  size_t bytes = src->mat->total() * src->mat->elemSize();
  write(this->fd, src->mat->data, bytes);
}
