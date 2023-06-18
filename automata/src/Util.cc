#include "Util.h"
#include "Mat.h"

void imread(const Napi::CallbackInfo& info){
  std::string fileName = std::string(info[0].As<Napi::String>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  * dest->mat = cv::imread( fileName, cv::IMREAD_COLOR);
}

void roi(const Napi::CallbackInfo& info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  cv::Mat srcMat = * src->mat;

  * dest->mat = srcMat(cv::Rect(
    info[2].As<Napi::Number>().Int32Value(),
    info[3].As<Napi::Number>().Int32Value(),
    info[4].As<Napi::Number>().Int32Value(),
    info[5].As<Napi::Number>().Int32Value()
  ));
}

void copy(const Napi::CallbackInfo& info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  src->mat->copyTo(* dest->mat);
}

void resize(const Napi::CallbackInfo& info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  cv::resize( *src->mat, * dest->mat, dest->mat->size(), 0, 0, cv::INTER_AREA);
}

void add(const Napi::CallbackInfo& info){
  Mat* a = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* b = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[2].As<Napi::Object>());
  cv::add( * a->mat, * b->mat, * dest->mat);
}

void subtract(const Napi::CallbackInfo& info){
  Mat* a = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* b = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[2].As<Napi::Object>());
  cv::subtract( * a->mat, * b->mat, * dest->mat);
}

void invert(const Napi::CallbackInfo& info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  cv::bitwise_not( * src->mat, * dest->mat);
}

void multiply(const Napi::CallbackInfo& info){
  Mat* a = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* b = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[2].As<Napi::Object>());
  double scalar = info[3].As<Napi::Number>().DoubleValue();
  cv::multiply( * a->mat, * b->mat, * dest->mat, scalar);
}

void addWeighted(const Napi::CallbackInfo& info){
  Mat* a = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  double alpha = info[1].As<Napi::Number>().DoubleValue();
  Mat* b = Napi::ObjectWrap<Mat>::Unwrap(info[2].As<Napi::Object>());
  double beta = info[3].As<Napi::Number>().DoubleValue();
  double gamma = info[4].As<Napi::Number>().DoubleValue();
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[5].As<Napi::Object>());
  cv::addWeighted( * a->mat, alpha, * b->mat, beta, gamma, * dest->mat);
}

void mulConstant(const Napi::CallbackInfo& info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  double gamma = info[1].As<Napi::Number>().DoubleValue();
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[2].As<Napi::Object>());
  cv::multiply( * src->mat, gamma, * dest->mat);
}

void absDiff(const Napi::CallbackInfo& info){
  Mat* a = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* b = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[2].As<Napi::Object>());
  cv::absdiff( * a->mat, * b->mat, * dest->mat);
}

void blur(const Napi::CallbackInfo& info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  int size = info[2].As<Napi::Number>().Int32Value();
  cv::blur(*src->mat,*dest->mat,cv::Size(size,size));
}

void threshold(const Napi::CallbackInfo& info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  int min = info[2].As<Napi::Number>().Int32Value();
  int max = info[3].As<Napi::Number>().Int32Value();
  cv::threshold(*src->mat,*dest->mat,min,max,cv::THRESH_BINARY);
}

void cvtColor(const Napi::CallbackInfo& info){
  Mat* src = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  int type = info[1].As<Napi::Number>().Int32Value();
  cv::cvtColor(*src->mat,*src->mat,type);
}

void max(const Napi::CallbackInfo& info){
  Mat* a = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* b = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[2].As<Napi::Object>());
  cv::max( * a->mat, * b->mat, * dest->mat);
}

void andx(const Napi::CallbackInfo& info){
  Mat* a = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  Mat* b = Napi::ObjectWrap<Mat>::Unwrap(info[1].As<Napi::Object>());
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[2].As<Napi::Object>());
  cv::bitwise_and( * a->mat, * b->mat, * dest->mat);
}



void putText(const Napi::CallbackInfo& info){
  Mat* dest = Napi::ObjectWrap<Mat>::Unwrap(info[0].As<Napi::Object>());
  std::string text = std::string(info[1].As<Napi::String>());
  int x = info[2].As<Napi::Number>().Int32Value();
  int y = info[3].As<Napi::Number>().Int32Value();
  double size = info[4].As<Napi::Number>().DoubleValue();

  int baseline=0;
  int lineWidth = 1;
  cv::Size textSize = getTextSize(text, cv::FONT_HERSHEY_SIMPLEX, 1, lineWidth, &baseline);

  cv::Point P1;
  P1.x=x;
  P1.y=y;
  
 cv::putText(* dest->mat, text, P1, cv::FONT_HERSHEY_SIMPLEX, size/textSize.height, cv::Scalar(0,0,0), lineWidth, cv::LINE_AA);
}

void InitUtil(Napi::Env env, Napi::Object exports){
  //Napi::Object util = Napi::Object::New(env);
  
  exports.Set("imread", Napi::Function::New(env, imread));
  exports.Set("roi", Napi::Function::New(env, roi));
  exports.Set("copy", Napi::Function::New(env, copy));
  exports.Set("resize", Napi::Function::New(env, resize));
  exports.Set("add", Napi::Function::New(env, add));
  exports.Set("subtract", Napi::Function::New(env, subtract));
  exports.Set("invert", Napi::Function::New(env, invert));
  exports.Set("multiply", Napi::Function::New(env, multiply));
  exports.Set("addWeighted", Napi::Function::New(env, addWeighted));
  exports.Set("mulConstant", Napi::Function::New(env, mulConstant));
  exports.Set("absdiff", Napi::Function::New(env, absDiff));
  exports.Set("blur", Napi::Function::New(env, blur));
  exports.Set("threshold", Napi::Function::New(env, threshold));
  exports.Set("cvtColor", Napi::Function::New(env, cvtColor));
  exports.Set("max", Napi::Function::New(env, max));
  exports.Set("and", Napi::Function::New(env, andx));
  exports.Set("putText", Napi::Function::New(env, putText));
  
  //exports.Set("util", util);
}