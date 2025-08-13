#ifndef ADVANCED_CALCULATOR_H
#define ADVANCED_CALCULATOR_H

#include "../calculator.h"

namespace Math {

class AdvancedCalculator : public Calculator {
public:
    AdvancedCalculator();
    virtual ~AdvancedCalculator();

    double power(double base, int exponent);
    double squareRoot(double value);
    double logarithm(double value, double base = 10.0);
    
    // Override base class method (which is already virtual)
    int multiply(int a, int b) override;
    
private:
    bool useCache;
};

} // namespace Math

#endif // ADVANCED_CALCULATOR_H 