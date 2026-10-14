import datetime
import csv
import json
import sys
from datetime import timezone, date
import pytz
import re
import numpy as np
import pandas as pd
import glob
import seaborn as sns
import matplotlib.pyplot as plt
from matplotlib.pyplot import figure
import os

#concat all the runs into one dataframe
def concatRuns(folderName):
    directory_to_process = f'{folderName}'
    allFiles = []

    for filename in os.listdir(directory_to_process):
        df = pd.read_csv(f'{folderName}/{filename}', index_col=None, header=0)
        allFiles.append(df)

    concatOutput = pd.concat(allFiles, axis=0, ignore_index=True)
    if not os.path.exists("output"):
        os.mkdir("output")
    concatOutput.to_csv(f'output/{folderName}_allruns.csv', index=False)

def plotter(folderName):
    allRuns = "output/"+str(folderName) + "_allruns.csv"

    #read in the combined csv data
    data = pd.read_csv(allRuns)

    #perform IQR outlier analysis
    Q1 = np.nanpercentile(data["Delay(s)"].to_numpy(), 25, interpolation='midpoint')
    Q3 = np.nanpercentile(data["Delay(s)"].to_numpy(), 75, interpolation='midpoint')
    IQR = Q3 - Q1
    upper=Q3+1.5*IQR
    lower=Q1-1.5*IQR
    trimmed_data = data[(data['Delay(s)'] < upper) & (data['Delay(s)'] > lower)]

    #print out latency statistics
    print("Mean Latency: " + str(trimmed_data["Delay(s)"].mean()))
    print("Max Latency: " + str(trimmed_data["Delay(s)"].max()))
    print("Std Dev Latency: " + str(trimmed_data["Delay(s)"].std()))
    print("75th Latency: " + str(trimmed_data["Delay(s)"].quantile(0.75)))
    print("95th Latency: " + str(trimmed_data["Delay(s)"].quantile(0.95)))

    #plot vehicle, streets, and cloud data histograms if they were part of the test
    units = ["DOT-45244", "DOT-45254","DOT_45254","vehicle_id","rsu_1234","kafka_id","cloud_id"]
    for unit in units:
        unit_data = trimmed_data[trimmed_data['Unit Id'] == unit]

        if len(unit_data) > 0:
            fig, ax1 = plt.subplots()
            fig.set_size_inches(10, 10)
            sns.histplot(unit_data['Delay(s)'], kde=False)
            plt.xlim(0, 0.75)
            plt.xlabel('Latency(s)', fontsize=18)
            plt.ylabel('Count', fontsize=18)
            plt.xticks(fontsize=15)
            plt.yticks(fontsize=15)
            plt.title(folderName + " " + unit + " Latency Histogram", fontsize=18)
            plt.savefig(f'output/{folderName}_{unit}_latency_hist.png')

def main():
    if len(sys.argv) < 2:
        print('Run with: "python3 latencyPlotter.py testcase"')
    else:
        test = sys.argv[1]

        concatRuns(test)
        plotter(test)

if __name__ == "__main__":
    main()
