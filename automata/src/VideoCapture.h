#include <napi.h>
#include <opencv2/videoio.hpp>

class VideoCapture : public Napi::ObjectWrap<VideoCapture> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  VideoCapture(const Napi::CallbackInfo& info);
  void read(const Napi::CallbackInfo &info);
  void release(const Napi::CallbackInfo &info);
  cv::VideoCapture * cap;

 private:
  static Napi::FunctionReference constructor;
};
