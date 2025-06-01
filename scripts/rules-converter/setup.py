from setuptools import setup, find_packages

setup(
    name="rules-converter",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "click>=8.1.3",
    ],
    entry_points={
        'console_scripts': [
            'rules-converter=rules_converter.cli:main',
        ],
    },
)
