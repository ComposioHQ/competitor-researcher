import os
import re
import time
import requests
from bs4 import BeautifulSoup
from openai import OpenAI, OpenAIError
from composio_crewai import ComposioToolset, App, ComposioSDK
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import logging
from flask import Flask, request, jsonify, Response
from flask_cors import CORS, cross_origin
import base64

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable must be set.")

llm = ChatOpenAI(openai_api_key=OPENAI_API_KEY, model="gpt-4-turbo")

def step_parser(step_output):
    action_log = ""
    observation_log = ""
    for step in step_output:
        if isinstance(step, tuple) and len(step) == 2:
            action, observation = step
            if (
                isinstance(action, dict)
                and "tool" in action
                and "tool_input" in action
                and "log" in action
            ):
                all_string = f"Log: \n {action['Action']} \n Action: {action['Action']}"

            elif isinstance(action, str):
                thought_match = re.search(r"Thought: (.*)", action)
                action_match = re.search(r"Action: (.*)", action)
                action_input_match = re.search(r"Action Input: (.*)", action)
                only_thought = (
                    thought_match.group(1).split("\n")[0] if thought_match else ""
                )
                only_action = (
                    action_match.group(1).split("\n")[0] if action_match else ""
                )
                only_action_input = (
                    action_input_match.group(1).split("\n")[0]
                    if action_input_match
                    else ""
                )
                all_string = f"Thought: {only_thought} \n\n Action: {only_action} \n\n Action Input: {only_action_input}"
                action_log = all_string
            else:
                action_str = str(action)
                thought_match = re.search(r"Thought: (.*)", action_str)
                action_match = re.search(r"Action: (.*)", action_str)
                action_input_match = re.search(r"Action Input: (.*)", action_str)
                only_thought = (
                    thought_match.group(1).split("\n")[0] if thought_match else ""
                )
                only_action = (
                    action_match.group(1).split("\n")[0] if action_match else ""
                )
                only_action_input = (
                    action_input_match.group(1).split("\n")[0]
                    if action_input_match
                    else ""
                )
                all_string = f"Thought: {only_thought} \n\n Action: {only_action} \n\n Action Input: {only_action_input}"
                action_log = all_string

            observation_log = str(observation)
        else:
            print(step)
        yield f" {action_log} \n\n Observation: \n {observation_log}".encode("utf-8")


@app.route("/authenticate", methods=["GET"])
def authenticate():
    entity_id = request.args.get("entity_id")
    entity = ComposioSDK.get_entity(str(entity_id))
    if entity.is_app_authenticated(App.NOTION) == False:
        resp = entity.initiate_connection(app_name=App.NOTION)
        print(
            f"Please authenticate {App.NOTION} in the browser and come back here. URL: {resp.redirectUrl}"
        )
        return jsonify({"URL": resp.redirectUrl, "message": "success"})
    else:
        print(f"Entity {entity_id} is already authenticated with Notion")
        return jsonify({"message": f"error"})


@app.route("/confirm_auth", methods=["GET"])
def confirm_auth():
    entity_id = request.args.get("entity_id")
    entity = ComposioSDK.get_entity(str(entity_id))
    confirm = entity.is_app_authenticated(App.NOTION)
    return jsonify({"auth_confirmation": confirm})


def remove_tags(html: str) -> str:
    """
    Remove specific HTML tags from the given HTML string.

    Args:
        html (str): The HTML string to be cleaned.

    Returns:
        str: The cleaned HTML string with specified tags removed.
    """
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["style", "script", "svg", "path", "clipboard-copy"]):
        tag.decompose()
    return " ".join(soup.stripped_strings)


def get_info(cleaned_html: str) -> str:
    """
    Call the OpenAI API to get information about a competitor based on the provided HTML.

    Args:
        cleaned_html (str): The cleaned HTML string to be analyzed.

    Returns:
        str: The response from the OpenAI API with information about the competitor.
    """
    client = OpenAI(api_key=OPENAI_API_KEY)
    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an assistant who's responsible for reading competitors website data that I'll provide you and giving me relevant information on my competitor.",
                },
                {
                    "role": "user",
                    "content": f"This is the data of the website of one of my competitors. I want a point-wise analysis. Don't repeat yourself and be to the point on whatever you say don't add uneccessary information. Include some stats with actual numbers, apply your own knowledge if you know about the said product but keep the data that I provide as the top priority. Have at least 7-8 points. Keep the whole thing under 2500 characters. \n Website Data: {cleaned_html}",
                },
            ],
        )
        return response.choices[0].message.content
    except OpenAIError as e:
        return jsonify({"error": f"{e}"})


@app.route("/scrape_website", methods=["POST"])
@cross_origin(origins="*")
def scrape_website():
    """
    Scrape a website and its subpages for text content.

    Args:
        url (str): The URL of the website to be scraped.

    Returns:
        List[str]: A list of cleaned text content from the website and its subpages.
    """
    url = request.json.get("url")
    content = []
    reqs = requests.get(url)
    content.append(remove_tags(reqs.content))

    cleaned_content = "\n".join(content)
    competitor_info = get_info(cleaned_content)
    return jsonify(competitor_info)


@app.route("/create_notion_page", methods=["GET"])
def create_notion_page():
    parent_page = request.args.get('parent_page')
    entity_id = request.args.get('entity_id')
    
    encoded_competitor_data = request.args.get('competitor_data')
    competitor_data = base64.b64decode(encoded_competitor_data)
    
    def step_callback(step_output):
        nonlocal logs_buffer
        logs_buffer.extend(step_parser(step_output))

    logs_buffer = [] 
    
    composio_crewai = ComposioToolset([App.NOTION], entity_id=entity_id)
    
    agent = Agent(
        role="Notion Agent",
        goal="Take action on Notion.",
        backstory="You are an AI Agent with access to Notion",
        verbose=True,
        tools=composio_crewai,
        llm=llm,
        step_callback=step_callback,
    )
    
    task = Task(
        description=f"Create a page for the competitor with the specified name. If a page with the same name already exists, append a unique identifier as a prefix or suffix. Create the page under '{parent_page}', if the parent page '{parent_page}' doesn't exist, find the most suitable parent page among existing pages. Place the pointers given to you in the created page without altering them. \nPointers to be included in the page: {competitor_data}. \n Your task ends only after successfully putting in the pointers in the page that you created.",
        expected_output="List down the contents of the page and title of the page created.",
        agent=agent,
        async_execution=True,
    )
    
    task.execute()

    def generate_log_stream():
        while True:
            if logs_buffer:
                yield f"data: {logs_buffer.pop(0)}\n\n"
            else:
                time.sleep(1)

    return Response(generate_log_stream(), mimetype="text/event-stream")


def main():
    app.run(debug=True)


if __name__ == "__main__":
    main()
