import requests
import concurrent.futures

BASE_URL = "http://localhost:5000"  # Change this if your server runs elsewhere

login_data = {"username": "admin", "password": "0000"}
login_response = requests.post(f"{BASE_URL}/user/login", data=login_data)

if login_response.status_code != 200:
    raise Exception("Login failed!")

token = login_response.json().get("access_token")  # Adjust key if needed

# Headers with the auth token
auth_headers = {"Authorization": f"Bearer {token}"}

constellations = requests.get(f"{BASE_URL}/mmda/constellation/",
                              headers=auth_headers)

discoursemes = requests.get(f"{BASE_URL}/mmda/discourseme/",
                            headers=auth_headers)


constellation_id = constellations.json()[0]['id']

description = requests.post(f"{BASE_URL}/mmda/constellation/{constellation_id}/description/",
                            json={
                                'corpus_id': 1,
                                's': 'text',
                                'overlap': 'full'
                            },
                            headers=auth_headers)

description_id = description.json()['id']

collocation = requests.post(f"{BASE_URL}/mmda/constellation/{constellation_id}/description/{description_id}/collocation",
                            json={
                                'focus_discourseme_id': 1,
                                'p': 'lemma',
                                'window': 10
                            },
                            headers=auth_headers)

collocation_id = collocation.json()['id']


def make_request(point):
    return requests.get(f"{BASE_URL}/mmda/constellation/{constellation_id}/description/{description_id}/collocation/{collocation_id}/{point}",
                        headers=auth_headers)


with concurrent.futures.ThreadPoolExecutor() as executor:
    future1 = executor.submit(make_request, "map")
    future2 = executor.submit(make_request, "map")
    # future3 = executor.submit(make_request, "items")
    # future4 = executor.submit(make_request, "items")
    # future5 = executor.submit(make_request, "items")
    # future6 = executor.submit(make_request, "items")

    response1 = future1.result()
    response2 = future2.result()
    # response3 = future3.result()
    # response4 = future4.result()
    # response5 = future5.result()
    # response6 = future6.result()

# Print responses
print("Response 1:", response1.status_code)
print("Response 2:", response2.status_code)
# print("Response 3:", response3.status_code)
# print("Response 4:", response4.status_code)
# print("Response 5:", response5.status_code)
# print("Response 6:", response6.status_code)
