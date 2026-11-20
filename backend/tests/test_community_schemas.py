import pytest
from pydantic import ValidationError

from app.schemas import CommunityCreateRequest, CommunityCreateResponse

GAME_ID = "00000000-0000-0000-0000-000000000002"
COMMUNITY_ID = "00000000-0000-0000-0000-000000000003"


def valid_community_request() -> dict[str, object]:
    return {
        "name": "  Nexus Raiders  ",
        "game_id": GAME_ID,
        "region": "  Global  ",
        "description": "  A community for coordinated matches.  ",
        "logo_url": "  https://images.example.com/logo.png  ",
        "banner_url": None,
    }


def test_community_create_request_normalizes_text_and_optional_urls() -> None:
    payload = valid_community_request()
    payload["logo_url"] = "  "

    request = CommunityCreateRequest.model_validate(payload)

    assert request.name == "Nexus Raiders"
    assert request.region == "Global"
    assert request.description == "A community for coordinated matches."
    assert request.logo_url is None
    assert request.banner_url is None


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "  "),
        ("name", "ab"),
        ("name", "n" * 121),
        ("region", " "),
        ("region", "x" * 81),
        ("description", "too short"),
        ("description", "d" * 501),
        ("logo_url", "not a URL"),
        ("logo_url", "http://images.example.com/logo.png"),
        ("logo_url", "https://user:pass@images.example.com/logo.png"),
        (
            "logo_url",
            f"https://example.com/{'a' * (2049 - len('https://example.com/'))}",
        ),
        ("banner_url", "http://images.example.com/banner.png"),
    ],
)
def test_community_create_request_rejects_invalid_fields(
    field: str,
    value: object,
) -> None:
    payload = valid_community_request()
    payload[field] = value

    with pytest.raises(ValidationError):
        CommunityCreateRequest.model_validate(payload)


@pytest.mark.parametrize(
    "field",
    ["id", "community_id", "owner_id", "member_count", "role"],
)
def test_community_create_request_forbids_generated_and_privileged_fields(
    field: str,
) -> None:
    payload = valid_community_request()
    payload[field] = COMMUNITY_ID

    with pytest.raises(ValidationError):
        CommunityCreateRequest.model_validate(payload)


def test_community_create_response_has_strict_directory_shape() -> None:
    response = CommunityCreateResponse.model_validate(
        {
            "community_id": COMMUNITY_ID,
            "name": "Nexus Raiders",
            "game_id": GAME_ID,
            "region": "Global",
            "member_count": 1,
            "description": "A community for coordinated matches.",
            "logo_url": "https://images.example.com/logo.png",
            "banner_url": None,
        }
    )

    assert str(response.community_id) == COMMUNITY_ID
    assert str(response.logo_url) == "https://images.example.com/logo.png"

    with pytest.raises(ValidationError):
        CommunityCreateResponse.model_validate(
            {
                **response.model_dump(),
                "owner_id": COMMUNITY_ID,
            }
        )
