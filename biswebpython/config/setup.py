import setuptools
import os

print('OS=',os.name);

if (os.name == 'nt'):
  print('In Windows');
  with open("README.md", "r") as fh:
     long_description = fh.read()
  with open("biswebpython/requirements.txt", "r") as fh:
     install_requires = list(fh.read().splitlines())
else:
  print('In UNIX');
  with open("README.md", "r") as fh:
     long_description = fh.read()
  with open("biswebpython/requirements.txt", "r") as fh:
     install_requires = list(fh.read().splitlines())

    
setuptools.setup(
    name="biswebpython",
    version="@BISWEB_VERSION@",
    author="BioImageSuite Web Team",
    author_email="xenophon.papademetris@yale.edu",
    description="A Medical Image Analysis Package",
    long_description=long_description,
    license="License :: OSI Approved :: GNU General Public License v2 (GPLv2)",
    long_description_content_type="text/markdown",
    url="https://github.com/bioimagesuiteweb/bisweb",
    packages=setuptools.find_packages(),
    install_requires=install_requires,
    classifiers=[
        "Programming Language :: Python :: 3.5",
        "Operating System :: OS Independent",
    ],
    entry_points = {
        'console_scripts': ['biswebpy=biswebpython.biswebpy:main', 'biswebpython=biswebpython.biswebpy:main' ]
    },
    python_requires='>=3.5',
    package_data={ '' : [ 'libbiswasm.so','libbiswasm.dylib','biswasm.dll','requirements.txt', 'PythonModuleList.txt', 'PythonModuleListAFNI.txt', 'test_module.py' ] }
)
