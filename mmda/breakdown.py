from apiflask import APIBlueprint, Schema
from flask import request, current_app
from .users import auth
from .database import Breakdown, BreakdownItems, Matches
from apiflask.fields import Integer, String
from . import db
from ccc import Corpus
from collections import Counter


bp = APIBlueprint('breakdown', __name__, url_prefix='/breakdown')


class BreakdownIn(Schema):

    query_id = Integer()
    p = String()


class BreakdownOut(Schema):

    id = Integer()
    query_id = Integer()
    p = String()


class BreakdownItemsOut(Schema):

    id = Integer()
    breakdown_id = Integer()
    item = String()
    freq = Integer()


@bp.post('/')
@bp.input(BreakdownIn)
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def create(data):
    """Create new breakdown.

    """
    breakdown = Breakdown(**data)
    db.session.add(breakdown)
    db.session.commit()

    return BreakdownOut().dump(breakdown), 200


@bp.get('/<id>')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def get_breakdown(id):
    """Get breakdown.

    """

    breakdown = db.get_or_404(Breakdown, id)
    return BreakdownOut().dump(breakdown), 200


@bp.post('/<id>/execute')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def execute(id):
    """Execute breakdown.

    """

    breakdown = db.get_or_404(Breakdown, id)
    p = request.json.get('p', 'word')

    matches = breakdown.query.matches

    if len(matches) == 0:
        raise ValueError()

    corpus = Corpus(breakdown.query.corpus.cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])

    items = list()
    for match in matches:
        items.append(" ".join(["_".join(corpus.cpos2patts(cpos, [p])) for cpos in range(match.match, match.matchend + 1)]))
    counts = Counter(items)
    for item, freq in counts.items():
        db.session.add(
            BreakdownItems(
                item=item,
                freq=freq,
                breakdown_id=breakdown.id
            )
        )
    db.session.commit()

    return BreakdownOut().dump(breakdown), 200


@bp.get("/<id>/items")
@bp.output(BreakdownItemsOut(many=True))
@bp.auth_required(auth)
def get_breakdown_items(id):

    breakdown = db.get_or_404(Breakdown, id)

    return [BreakdownItemsOut().dump(item) for item in breakdown.items], 200
