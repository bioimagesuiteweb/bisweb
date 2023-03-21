python="/Users/xenios/opt/anaconda3/bin/python"
jpath="/Users/xenios/bisweb/src/biswebpython/jupyter/"


[a,b]=system("/Users/xenios/opt/anaconda3/bin/python /Users/xenios/bisweb/src/biswebpython/jupyter/client.py 9001 '' 0 0")

v=jsondecode(b)
