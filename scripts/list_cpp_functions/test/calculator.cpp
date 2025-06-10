#include "calculator.h"
#include <cmath>

namespace Math {

Calculator::Calculator() : lastResult(0) {
}

Calculator::~Calculator() {
}

int Calculator::add(int a, int b) {
    lastResult = a + b;
    history.push_back(lastResult);
    return lastResult;
}

int Calculator::subtract(int a, int b) {
    lastResult = a - b;
    history.push_back(lastResult);
    return lastResult;
}

int Calculator::multiply(int a, int b) {
    lastResult = a * b;
    history.push_back(lastResult);
    return lastResult;
}

double Calculator::divide(double a, double b) {
    if (b == 0) {
        return 0.0;
    }
    double result = a / b;
    lastResult = static_cast<int>(result);
    history.push_back(lastResult);
    return result;
}

int Calculator::getLastResult() const {
    return lastResult;
}

// Namespace function implementation
double squareRoot(double value) {
    return std::sqrt(value);
}

} // namespace Math

// Global function implementation
int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
} 