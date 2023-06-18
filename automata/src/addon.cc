#include <napi.h>
#include "Mat.h"
#include "Util.h"
#include "VideoCapture.h"
#include "VideoWriter.h"
#include "PipeWriter.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  Mat::Init(env, exports);
  VideoCapture::Init(env, exports);
  VideoWriter::Init(env, exports);
  PipeWriter::Init(env, exports);
  InitUtil(env, exports);
  
  return exports;
}

NODE_API_MODULE(addon, InitAll)