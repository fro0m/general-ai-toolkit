#include <iostream>
#include <string>
#include <vector>
#include <cmath>

// Global function
void printMessage(const std::string& message) {
    std::cout << message << std::endl;
}

// Another global function with multiple parameters
int calculateSum(int a, int b, int c = 0) {
    return a + b + c;
}

// A class declaration
class Calculator {
public:
    // Constructor
    Calculator() : value(0) {}
    
    // Member method
    virtual int add(int a, int b) {
        value = a + b;
        return value;
    }
    
    // Const member method
    int getValue() const {
        return value;
    }
    
    // Static method
    static double multiply(double a, double b) {
        return a * b;
    }
    
private:
    int value;
};

// A struct with methods
struct Point {
    double x;
    double y;
    
    // Method in struct
    double distance() const {
        return std::sqrt(x*x + y*y);
    }
    
    // Another method
    void normalize() {
        double d = distance();
        if (d > 0) {
            x /= d;
            y /= d;
        }
    }
};

// Class with inheritance
class AdvancedCalculator : public Calculator {
public:
    // Constructor
    AdvancedCalculator() : Calculator() {}
    
    // Override method
    int add(int a, int b) override {
        // Call parent method
        int result = Calculator::add(a, b);
        history.push_back(result);
        return result;
    }
    
    // New method
    int subtract(int a, int b) {
        int result = a - b;
        history.push_back(result);
        return result;
    }
    
    // Template method
    template<typename T>
    T power(T base, int exponent) {
        T result = 1;
        for (int i = 0; i < exponent; ++i) {
            result *= base;
        }
        return result;
    }
    
private:
    std::vector<int> history;
};

// Function implementation
namespace Math {
    double squareRoot(double value) {
        return std::sqrt(value);
    }
}

int main() {
    printMessage("Hello, C++ Function Analyzer!");
    
    Calculator calc;
    calc.add(5, 3);
    
    Point p{3.0, 4.0};
    p.normalize();
    
    AdvancedCalculator advCalc;
    advCalc.subtract(10, 7);
    
    std::cout << "Power result: " << advCalc.power<double>(2.0, 3) << std::endl;
    
    return 0;
} 