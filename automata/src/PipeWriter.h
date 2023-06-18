#include <napi.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fcntl.h>

class PipeWriter : public Napi::ObjectWrap<PipeWriter> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  PipeWriter(const Napi::CallbackInfo& info);
  void writep(const Napi::CallbackInfo &info);
  int fd;

 private:
  static Napi::FunctionReference constructor;
};
