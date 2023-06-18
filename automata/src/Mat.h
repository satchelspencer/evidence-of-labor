#include <napi.h>
#include <opencv2/core.hpp>
#include <opencv2/highgui.hpp>

class Mat : public Napi::ObjectWrap<Mat> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Mat(const Napi::CallbackInfo& info);
  void show(const Napi::CallbackInfo &info);
  cv::Mat * mat;

 private:
  static Napi::FunctionReference constructor;
};
