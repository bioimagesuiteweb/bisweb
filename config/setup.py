import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="biswebpython",
    version="@BISWEB_VERSION@",
    author="BioImage Suite Web Team",
    author_email="xenophon.papademetris@yale.edu",
    description="A Medical Image Analysis Package",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/bioimagesuiteweb/bisweb",
    packages=setuptools.find_packages(),
    install_requires=[
        'numpy',
        'nibabel',
        'scikit-image',
        'pillow',
        'scipy'
    ],
    classifiers=[
        "Programming Language :: Python :: 3.5",
        "OSI Approved :: GNU General Public License v2 (GPLv2)",
        "Operating System :: OS Independent",
    ],
     python_requires='>=3.5',
)
