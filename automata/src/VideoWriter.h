#include <napi.h>
#include <opencv2/videoio.hpp>

class VideoWriter : public Napi::ObjectWrap<VideoWriter> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  VideoWriter(const Napi::CallbackInfo& info);
  void write(const Napi::CallbackInfo &info);
  cv::VideoWriter * writer;

 private:
  static Napi::FunctionReference constructor;
};
