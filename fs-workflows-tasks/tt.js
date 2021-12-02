// Deploy first:
// gcloud workflows deploy transactional-tasks --service-account=cloud-tasks-4@ekaramad-playground.iam.gserviceaccount.com --source=workflow.json
const { ExecutionsClient } = require('@google-cloud/workflows');
const client = new ExecutionsClient();

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

async function main() {
    try {
        const argsString = JSON.stringify({
            'mutations': [
                {
                    'upsert': {
                        'key': {
                            'path': [
                                {
                                    'name': 'users',
                                    'kind': 'a'
                                }
                            ]
                        },
                        'properties': {
                            'scores': {
                                'doubleValue': 65
                            }
                        }
                    }
                }
            ],
            "createUrl": "https://cloudtasks.googleapis.com/v2/projects/ekaramad-playground/locations/us-central1/queues/transactional-tasks/tasks",
            "task": {
                "httpRequest": {
                    "url": `https://www.google.ca?${Date.now()}`,
                    "httpMethod": "GET"
                }
            }
        });
        const createExec = await client.createExecution({
            parent: client.workflowPath('ekaramad-playground', 'us-central1', 'transactional-tasks'),
            execution: {
                argument: argsString
            }
        });
        const execName = createExec[0].name;
        console.log(`Created execution ${execName}`);

        let executionFinished = false;
        let backoffDelay = 1000; // Start wait with delay of 1,000 ms
        console.log('Poll every second for result...');
        while (!executionFinished) {
            const [execution] = await client.getExecution({
                name: execName,
            });
            executionFinished = execution.state !== 'ACTIVE';

            // If we haven't seen the result yet, wait a second.
            if (!executionFinished) {
                console.log('- Waiting for results...');
                await sleep(backoffDelay);
                backoffDelay *= 2; // Double the delay to provide exponential backoff.
            } else {
                console.log(`Execution finished with state: ${execution.state}`);
                console.log(execution.result);
                return execution.result;
            }
        }
    } catch (e) {
        console.error(`Error executing workflow: ${e}`);
    }
}


main().then(() => console.log('done')).catch(e => { console.log(e) });