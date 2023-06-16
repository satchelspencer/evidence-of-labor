#include <napi.h>

#include "Mat.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  Mat::Init(env, exports);
  return exports;
}

NODE_API_MODULE(addon, InitAll)