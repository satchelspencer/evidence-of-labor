#include <napi.h>
#include "opencv2/imgcodecs.hpp"
#include "opencv2/imgproc.hpp"

void imread(const Napi::CallbackInfo& info);
void roi(const Napi::CallbackInfo &info);
void copy(const Napi::CallbackInfo &info);
void resize(const Napi::CallbackInfo &info);
void add(const Napi::CallbackInfo &info);
void subtract(const Napi::CallbackInfo &info);
void invert(const Napi::CallbackInfo &info);
void multiply(const Napi::CallbackInfo &info);
void addWeighted(const Napi::CallbackInfo &info);
void mulConstant(const Napi::CallbackInfo &info);
void absDiff(const Napi::CallbackInfo &info);
void blur(const Napi::CallbackInfo &info);
void threshold(const Napi::CallbackInfo &info);
void cvtColor(const Napi::CallbackInfo &info);
void max(const Napi::CallbackInfo &info);
void andx(const Napi::CallbackInfo &info);
void putText(const Napi::CallbackInfo &info);

void InitUtil(Napi::Env env, Napi::Object exports);