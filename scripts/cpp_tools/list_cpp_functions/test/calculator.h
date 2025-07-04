#ifndef CALCULATOR_H
#define CALCULATOR_H

#include <vector>

namespace Math {

class Calculator {
public:
    Calculator();
    virtual ~Calculator();

    int add(int a, int b);
    int subtract(int a, int b);
    virtual int multiply(int a, int b);
    double divide(double a, double b);

    int getLastResult() const;
    
private:
    int lastResult;
    std::vector<int> history;
};

// Global utility function in namespace
double squareRoot(double value);

} // namespace Math

// Global function outside namespace
int factorial(int n);

#endif // CALCULATOR_H 